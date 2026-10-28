// src/validators/auth.validator.ts
import { body } from "express-validator";

export const registerValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .isLength({ min: 7, max: 20 })
    .withMessage("Please enter a valid phone number"),

  body("role")
    .optional()
    .isIn(["transporter", "shipper"])
    .withMessage("Role must be either transporter or shipper"),
];

export const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];

// --- Project lesson 04.1 -------------------------------------------------

export const forgotPasswordValidator = [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
];

export const resetPasswordValidator = [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("otp")
    .exists({ checkFalsy: true })
    .withMessage("Verification code is required")
    .bail()
    .isString()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Code must be 6 digits"),
  body("newPassword")
    .exists({ checkFalsy: true })
    .withMessage("New password is required")
    .bail()
    .isLength({ min: 6, max: 100 })
    .withMessage("Password must be at least 6 characters"),
];

export const changePasswordValidator = [
  body("currentPassword")
    .exists({ checkFalsy: true })
    .withMessage("Current password is required"),
  body("newPassword")
    .exists({ checkFalsy: true })
    .withMessage("New password is required")
    .bail()
    .isLength({ min: 6, max: 100 })
    .withMessage("Password must be at least 6 characters"),
];

export const verifyEmailValidator = [
  body("otp")
    .exists({ checkFalsy: true })
    .withMessage("Verification code is required")
    .bail()
    .isString()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Code must be 6 digits"),
];