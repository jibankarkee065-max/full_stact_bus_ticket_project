
 // src/services/otpService.ts
// Every OTP-related controller goes through this service -- no controller
// writes to OtpToken directly.
import crypto from "crypto";
import { Types } from "mongoose";
import OtpToken, {
  type IOtpToken,
  type OtpPurpose,
} from "../models/OtpToken.js";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const OTP_LENGTH = 6;

export function otpTtlMinutes(): number {
  return OTP_TTL_MINUTES;
}

function generateNumericCode(length: number): string {
  // crypto.randomInt is uniform, unlike Math.random -- every code is equally
  // likely, which matters for a security token.
  let code = "";
  for (let i = 0; i < length; i++) {
    code += crypto.randomInt(0, 10).toString();
  }
  return code;
}

function hashCode(code: string): string {
  // SHA-256 suits an OTP: a short-lived, high-entropy secret where brute
  // force is bounded by the attempt counter rather than by CPU cost.
  return crypto.createHash("sha256").update(code).digest("hex");
}

// Issue a fresh OTP: invalidate any earlier code for this (user, purpose),
// then return the plaintext once so the caller can email it. After this the
// plaintext is unrecoverable -- only its hash is stored.
export async function issueOtp(
  userId: string | Types.ObjectId,
  purpose: OtpPurpose
): Promise<string> {
  const now = new Date();

  await OtpToken.updateMany(
    { user: userId, purpose, consumedAt: { $exists: false } },
    { $set: { consumedAt: now } }
  );

  const code = generateNumericCode(OTP_LENGTH);

  await OtpToken.create({
    user: userId,
    purpose,
    tokenHash: hashCode(code),
    expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000),
    attempts: 0,
  });

  return code;
}

interface VerifyResult {
  ok: boolean;
  reason?: "not_found" | "expired" | "too_many_attempts" | "mismatch";
}

// Verify and consume in one step. A correct code is marked consumed so it
// cannot be replayed. A wrong code bumps the attempt counter, and once
// MAX_ATTEMPTS is reached the token is burned even if guessing continues.
export async function verifyOtp(
  userId: string | Types.ObjectId,
  purpose: OtpPurpose,
  code: string
): Promise<VerifyResult> {
  const now = new Date();

  const token: IOtpToken | null = await OtpToken.findOne({
    user: userId,
    purpose,
    consumedAt: { $exists: false },
  }).sort({ createdAt: -1 });

  if (!token) return { ok: false, reason: "not_found" };
  if (token.expiresAt < now) return { ok: false, reason: "expired" };

  if (token.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  if (token.tokenHash !== hashCode(code)) {
    token.attempts += 1;

    if (token.attempts >= MAX_ATTEMPTS) {
      token.consumedAt = now;
    }

    await token.save();
    return { ok: false, reason: "mismatch" };
  }

  token.consumedAt = now;
  await token.save();

  return { ok: true };
}
