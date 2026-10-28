// src/middleware/validate.ts
import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

// Shared middleware -- runs after a validator chain. Returns a 400 with
// structured errors if any rule failed, otherwise calls next().
export const validateResult = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: "path" in err ? err.path : "unknown",
        message: err.msg,
      })),
    });
    return;
  }

  next();
};