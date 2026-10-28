
 // src/services/mailService.ts

import { getMailer } from "../config/mail.js";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  const { transporter, from } = getMailer();

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    // Nodemailer can derive a text fallback, but our own reads better in
    // strict clients.
    text: opts.text ?? stripHtml(opts.html),
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

export function otpEmail(params: {
  name: string;
  code: string;
  purpose: "password_reset" | "email_verify";
  expiresInMinutes: number;
}): { subject: string; html: string } {
  const isReset = params.purpose === "password_reset";

  const heading = isReset
    ? "Reset your CargoTruck password"
    : "Verify your CargoTruck email";

  const subject = isReset
    ? "Your password reset code"
    : "Your email verification code";

  const action = isReset
    ? "reset your password"
    : "verify your email address";

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin-top:0">${heading}</h2>
      <p>Hi ${escapeHtml(params.name)},</p>
      <p>Use the code below to ${action}. It expires in <strong>${params.expiresInMinutes} minutes</strong> and can only be used once.</p>
      <div style="font-size: 32px; letter-spacing: 8px; font-weight: bold; text-align: center; padding: 24px; background: #f6f6f6; border-radius: 8px; margin: 24px 0;">
        ${escapeHtml(params.code)}
      </div>
      <p style="color:#666; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  return { subject, html };
}

// Never interpolate raw user input into an HTML email body.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
