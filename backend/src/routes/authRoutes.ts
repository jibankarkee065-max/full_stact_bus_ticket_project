// src/routes/authRoutes.ts
import { Router } from "express";
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  sendEmailVerifyOtp,
  verifyEmail,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateResult } from "../middleware/validate.js";
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  verifyEmailValidator,
} from "../validatores/auth.validator.js";

const router: Router = Router();

// Public
router.post("/register", registerValidator, validateResult, register);
router.post("/login", loginValidator, validateResult, login);
router.post(
  "/forgot-password",
  forgotPasswordValidator,
  validateResult,
  forgotPassword
);
router.post(
  "/reset-password",
  resetPasswordValidator,
  validateResult,
  resetPassword
);

// Authenticated
router.get("/me", requireAuth, getMe);
router.post(
  "/change-password",
  requireAuth,
  changePasswordValidator,
  validateResult,
  changePassword
);
router.post("/send-email-verify-otp", requireAuth, sendEmailVerifyOtp);
router.post(
  "/verify-email",
  requireAuth,
  verifyEmailValidator,
  validateResult,
  verifyEmail
);

export default router;