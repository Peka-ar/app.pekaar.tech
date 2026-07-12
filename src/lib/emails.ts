import { getResend } from "@/lib/resend";

const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`Skipping email to ${to}: RESEND_API_KEY is not configured`);
    return;
  }

  await getResend().emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${appUrl}/auth/verify?token=${token}`;

  await sendEmail(
    email,
    "Verify your STUDIO.V account",
    `<p>Welcome to STUDIO.V.</p><p>Verify your email to activate your account:</p><p><a href="${verifyUrl}">Verify email</a></p>`
  );
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

  await sendEmail(
    email,
    "Reset your STUDIO.V password",
    `<p>Use this link to reset your STUDIO.V password:</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 1 hour.</p>`
  );
}
