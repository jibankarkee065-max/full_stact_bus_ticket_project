// src/models/OtpToken.ts
// A separate collection rather than extra fields on User: purposes stay
// isolated, several pending codes are natural, and MongoDB can auto-purge
// expired ones with a TTL index.
import mongoose, { Schema, Document, Types } from "mongoose";

export type OtpPurpose = "password_reset" | "email_verify";

export interface IOtpToken extends Document {
  user: Types.ObjectId;
  purpose: OtpPurpose;
  tokenHash: string; // SHA-256 of the code -- never the plaintext
  expiresAt: Date;
  consumedAt?: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const otpTokenSchema = new Schema<IOtpToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["password_reset", "email_verify"],
      required: true,
    },
    tokenHash: { type: String, required: true },
    // The TTL index below already indexes this field -- adding index: true
    // here would create a duplicate.
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: undefined },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// TTL: MongoDB deletes each document once its own expiresAt has passed.
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fast lookup for "is there a live OTP for this user + purpose?"
otpTokenSchema.index({ user: 1, purpose: 1, consumedAt: 1 });

const OtpToken = mongoose.model<IOtpToken>("OtpToken", otpTokenSchema);
export default OtpToken;