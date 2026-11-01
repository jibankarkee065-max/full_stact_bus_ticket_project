import { sendMail as sendMailWithMailtrap } from "../config/mail.js";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  await sendMailWithMailtrap({
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? stripHtml(opts.html),
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
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
    ? "Reset your Bus Ticket Booking password"
    : "Verify your Bus Ticket Booking email";

  const subject = isReset
    ? "Your password reset code"
    : "Your email verification code";

  const action = isReset
    ? "reset your password"
    : "verify your email address";

  const html = `
    <div>
      <h2>${heading}</h2>
      <p>Hi ${escapeHtml(params.name)},</p>
      <p>Use this code to ${action}.</p>
      <h1>${escapeHtml(params.code)}</h1>
      <p>This code expires in ${params.expiresInMinutes} minutes.</p>
    </div>
  `;

  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}