// src/controllers/authController.ts
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import User, { type IUser,  type UserRole } from "../models/User.js";
import { issueOtp, verifyOtp, otpTtlMinutes } from "../services/otpService.js";
import { sendMail, otpEmail } from "../services/mailService.js";

const JWT_SECRET: string = process.env.JWT_SECRET || "fallback-secret";
const JWT_OPTIONS: SignOptions = { expiresIn: "7d" };

interface TokenPayload {
  userId: string;
  role: UserRole;
}

const generateToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: (user._id as { toString(): string }).toString(),
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, JWT_OPTIONS);
};

// Strip the password (and any future sensitive fields) before sending
// the user back to the client.
const toPublicUser = (user: IUser) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// POST /api/auth/register
// Validation handled by registerValidator + validateResult middleware
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, role } = req.body;

    const existingUser: IUser | null = await User.findOne({ email });
    if (existingUser) {
      res
        .status(400)
        .json({ message: "A user with this email already exists" });
      return;
    }

    const saltRounds: number = 10;
    const hashedPassword: string = await bcrypt.hash(password, saltRounds);

    const user: IUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || "shipper",
    });

    const token: string = generateToken(user);

    res.status(201).json({
      data: {
        user: toPublicUser(user),
        token,
      },
    });
  } catch (error: unknown) {
    console.error("register error:", error);
    res.status(500).json({ message: "Failed to register user" });
  }
};

// POST /api/auth/login
// Validation handled by loginValidator + validateResult middleware
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // The password field has select: false, so ask for it explicitly
    const user: IUser | null = await User.findOne({ email }).select(
      "+password"
    );
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const isPasswordValid: boolean = await bcrypt.compare(
      password,
      user.password
    );
    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const token: string = generateToken(user);

    res.status(200).json({
      data: {
        user: toPublicUser(user),
        token,
      },
    });
  } catch (error: unknown) {
    console.error("login error:", error);
    res.status(500).json({ message: "Failed to log in" });
  }
};

// GET /api/auth/me
// Requires requireAuth middleware so req.user is set
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId: string = req.user!.userId;

    const user: IUser | null = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      data: toPublicUser(user),
    });
  } catch (error: unknown) {
    console.error("getMe error:", error);
    res.status(500).json({ message: "Failed to fetch current user" });
  }
};

// --- Project lesson 04.1: forgot / reset / change password, verify email ---

// Every failure that is not "too many attempts" collapses to the same
// message, so an attacker cannot tell "no such user" from "wrong code".
const VERIFY_ERRORS: Record<string, string> = {
  not_found: "Invalid or expired code",
  expired: "Invalid or expired code",
  too_many_attempts: "Too many attempts. Request a new code and try again.",
  mismatch: "Invalid or expired code",
};

// POST /api/auth/forgot-password (public)
// Responds identically whether or not the email exists -- otherwise this
// endpoint becomes a way to discover who has an account.
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body as { email: string };

    const user = await User.findOne({ email });
    if (user) {
      const code = await issueOtp(user.id, "password_reset");
      const { subject, html } = otpEmail({
        name: user.name,
        code,
        purpose: "password_reset",
        expiresInMinutes: otpTtlMinutes(),
      });
      // Awaited so a send failure surfaces as a 500. In production this
      // would go onto a background queue instead.
      await sendMail({ to: user.email, subject, html });
    }

    res.status(200).json({
      message: "If an account exists for that email, a code has been sent.",
    });
  } catch (error: unknown) {
    console.error("forgotPassword error:", error);
    res.status(500).json({ message: "Failed to send password reset code" });
  }
};

// POST /api/auth/reset-password (public)
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body as {
      email: string;
      otp: string;
      newPassword: string;
    };

    const user = await User.findOne({ email });
    if (!user) {
      // Same message as a genuinely bad code -- never confirm existence.
      res.status(400).json({ message: "Invalid or expired code" });
      return;
    }

    const result = await verifyOtp(user.id, "password_reset", otp);
    if (!result.ok) {
      res.status(400).json({ message: VERIFY_ERRORS[result.reason!] });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      message:
        "Password reset successful. You can now sign in with your new password.",
    });
  } catch (error: unknown) {
    console.error("resetPassword error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
};

// POST /api/auth/change-password (authenticated)
export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    const userId = req.user!.userId;

    // password is select: false on the schema -- ask for it explicitly.
    const user = await User.findById(userId).select("+password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      res.status(400).json({ message: "Current password is incorrect" });
      return;
    }
    if (currentPassword === newPassword) {
      res.status(400).json({
        message: "New password must be different from current password",
      });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error: unknown) {
    console.error("changePassword error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
};

// POST /api/auth/send-email-verify-otp (authenticated)
export const sendEmailVerifyOtp = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (user.emailVerified) {
      res.status(400).json({ message: "Email is already verified" });
      return;
    }

    const code = await issueOtp(user.id, "email_verify");
    const { subject, html } = otpEmail({
      name: user.name,
      code,
      purpose: "email_verify",
      expiresInMinutes: otpTtlMinutes(),
    });
    await sendMail({ to: user.email, subject, html });

    res.status(200).json({ message: "Verification code sent to your email." });
  } catch (error: unknown) {
    console.error("sendEmailVerifyOtp error:", error);
    res.status(500).json({ message: "Failed to send verification code" });
  }
};

// POST /api/auth/verify-email (authenticated)
export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { otp } = req.body as { otp: string };
    const userId = req.user!.userId;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (user.emailVerified) {
      res.status(400).json({ message: "Email is already verified" });
      return;
    }

    const result = await verifyOtp(user.id, "email_verify", otp);
    if (!result.ok) {
      res.status(400).json({ message: VERIFY_ERRORS[result.reason!] });
      return;
    }

    user.emailVerified = true;
    await user.save();

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error: unknown) {
    console.error("verifyEmail error:", error);
    res.status(500).json({ message: "Failed to verify email" });
  }
};