import { getTransporter } from "@/lib/mail";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn(`Skipping email to ${to}: Gmail SMTP is not configured`);
    return;
  }

  await getTransporter().sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    html,
    text,
  });
}

export async function sendVerificationOtpEmail(email: string, otp: string) {
  const html = `<p>Welcome to STUDIO.V.</p><p>Use this one-time code to verify your email:</p><p style="font-size:24px;font-weight:700;letter-spacing:0.3em;">${otp}</p><p>This code expires in 10 minutes.</p>`;
  const text = `Welcome to STUDIO.V.\n\nUse this one-time code to verify your email: ${otp}\n\nThis code expires in 10 minutes.`;

  await sendEmail(email, "Your STUDIO.V verification code", html, text);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

  const html = `<p>Use this link to reset your STUDIO.V password:</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 1 hour.</p>`;
  const text = `Reset your STUDIO.V password:\n\n${resetUrl}\n\nThis link expires in 1 hour.`;

  await sendEmail(email, "Reset your STUDIO.V password", html, text);
}
