
// src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "../models/User.js";

const JWT_SECRET: string | undefined = process.env.JWT_SECRET;

interface TokenPayload {
  userId: string;
  role: UserRole;
}

// Require authentication. Reads the JWT from the Authorization header,
// verifies it, attaches the decoded user to req.user, and calls next().
// On any failure responds 401.
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!JWT_SECRET) {
      res.status(500).json({ message: "JWT_SECRET is not configured" });
      return;
    }

    const authHeader: string | undefined = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      res.status(401).json({ message: "Invalid authorization token" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("JWT verification error:", error);

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        message: "Token expired. Please login again.",
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        message: "Invalid token: " + error.message,
      });
      return;
    }

    res.status(401).json({
      message: "Authentication failed",
    });
  }
};

// Require a specific role. Use after requireAuth:
// router.post("/", requireAuth, requireRole("transporter"), createTruck);
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: "You do not have permission to perform this action",
      });
      return;
    }

    next();
  };
};
