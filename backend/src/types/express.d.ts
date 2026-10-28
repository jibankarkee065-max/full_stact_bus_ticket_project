// src/types/express.d.ts
// Extends the Express Request type so req.user is recognised everywhere
// after requireAuth has run.

import "express";
import type { UserRole } from "../models/User";

declare module "express" {
  interface Request {
    user?: {
      userId: string;
      role: UserRole;
    };
  }
}