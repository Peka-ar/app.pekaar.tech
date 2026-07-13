"use server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sendPasswordResetEmail, sendVerificationOtpEmail } from "@/lib/emails";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

const EMAIL_VERIFICATION_TYPE = "email_verification";
const EMAIL_VERIFICATION_OTP_TYPE = "email_verification_otp";
const PASSWORD_RESET_TYPE = "password_reset";

type CompleteOnboardingInput = {
  companyName: string;
  productCategory?: string;
  storefrontPlatform?: string;
  catalogSize?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateOtp() {
  return crypto.getRandomValues(new Uint32Array(1))[0].toString().padStart(10, "0").slice(0, 6);
}

async function issueVerificationOtp(email: string) {
  await prisma.token.deleteMany({
    where: { identifier: email, type: { in: [EMAIL_VERIFICATION_TYPE, EMAIL_VERIFICATION_OTP_TYPE] } },
  });

  const otp = generateOtp();
  await prisma.token.create({
    data: {
      identifier: email,
      token: await hashPassword(otp),
      type: EMAIL_VERIFICATION_OTP_TYPE,
      expires: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await sendVerificationOtpEmail(email, otp);
}

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function preflightLogin(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return { status: "invalid_password" as const };
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    return { status: "not_registered" as const };
  }

  if (!user.emailVerified) {
    return { status: "unverified" as const };
  }

  if (!user.hashedPassword || !(await verifyPassword(password, user.hashedPassword))) {
    return { status: "invalid_password" as const };
  }

  return { status: "valid" as const, onboarded: user.onboarded };
}

export async function resendVerificationOtp(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { email: true, emailVerified: true },
  });

  if (!user) {
    return { success: false, status: "not_registered" as const };
  }

  if (user.emailVerified) {
    return { success: false, status: "already_verified" as const };
  }

  await issueVerificationOtp(normalizedEmail);
  return { success: true, status: "sent" as const };
}

export async function registerUser(formData: FormData) {
  const email = normalizeEmail(formData.get("email") as string);
  const password = formData.get("password") as string;

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.emailVerified) {
      throw new Error("Email already registered");
    }

    await prisma.user.update({
      where: { email },
      data: { hashedPassword: await hashPassword(password) },
    });
    await issueVerificationOtp(email);

    return { email, verificationRequired: true };
  }

  const hashedPassword = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      hashedPassword,
      role: "BRAND",
      usageLimits: 10,
    },
  });

  await issueVerificationOtp(email);

  return { email, verificationRequired: true };
}

export async function verifyEmail(token: string) {
  const verificationToken = await prisma.token.findFirst({
    where: { token, type: EMAIL_VERIFICATION_TYPE, expires: { gt: new Date() } },
  });

  if (!verificationToken) {
    throw new Error("Verification link is invalid or expired");
  }

  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  });

  await prisma.token.delete({ where: { token } });

  return { success: true };
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    return { success: true };
  }

  const token = crypto.randomUUID();
  await prisma.token.create({
    data: {
      identifier: normalizedEmail,
      token,
      type: PASSWORD_RESET_TYPE,
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await sendPasswordResetEmail(normalizedEmail, token);

  return { success: true };
}

export async function resetPassword(token: string, password: string) {
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const resetToken = await prisma.token.findFirst({
    where: { token, type: PASSWORD_RESET_TYPE, expires: { gt: new Date() } },
  });

  if (!resetToken) {
    throw new Error("Reset link is invalid or expired");
  }

  await prisma.user.update({
    where: { email: resetToken.identifier },
    data: { hashedPassword: await hashPassword(password) },
  });

  await prisma.token.delete({ where: { token } });

  return { success: true };
}

export async function verifyEmailOtp(email: string, otp: string) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = otp.trim();

  if (!normalizedEmail || !/^\d{6}$/.test(normalizedOtp)) {
    throw new Error("Enter the 6-digit verification code");
  }

  const verificationTokens = await prisma.token.findMany({
    where: {
      identifier: normalizedEmail,
      type: EMAIL_VERIFICATION_OTP_TYPE,
      expires: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const verificationToken of verificationTokens) {
    if (await verifyPassword(normalizedOtp, verificationToken.token)) {
      await prisma.user.update({
        where: { email: normalizedEmail },
        data: { emailVerified: new Date() },
      });

      await prisma.token.deleteMany({
        where: { identifier: normalizedEmail, type: EMAIL_VERIFICATION_OTP_TYPE },
      });

      return { success: true };
    }
  }

  throw new Error("Verification code is invalid or expired");
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const companyName = input.companyName.trim();

  if (!companyName.trim()) {
    throw new Error("Company name is required");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: companyName,
      productCategory: optionalText(input.productCategory),
      storefrontPlatform: optionalText(input.storefrontPlatform),
      catalogSize: optionalText(input.catalogSize),
      onboarded: true,
    },
  });

  revalidatePath("/auth");
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/integrations");

  return { success: true };
}
