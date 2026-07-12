"use server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/emails";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      hashedPassword,
      role: "BRAND",
      usageLimits: 10,
    },
  });

  const token = crypto.randomUUID();
  await prisma.token.create({
    data: {
      identifier: email,
      token,
      type: "email_verification",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await sendVerificationEmail(email, token);

  return { id: user.id, email: user.email };
}

export async function verifyEmail(token: string) {
  const verificationToken = await prisma.token.findFirst({
    where: { token, type: "email_verification", expires: { gt: new Date() } },
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
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { success: true };
  }

  const token = crypto.randomUUID();
  await prisma.token.create({
    data: {
      identifier: email,
      token,
      type: "password_reset",
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await sendPasswordResetEmail(email, token);

  return { success: true };
}

export async function resetPassword(token: string, password: string) {
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const resetToken = await prisma.token.findFirst({
    where: { token, type: "password_reset", expires: { gt: new Date() } },
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

export async function completeOnboarding(companyName: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!companyName.trim()) {
    throw new Error("Company name is required");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: companyName.trim(), onboarded: true },
  });

  revalidatePath("/auth");
  revalidatePath("/tasks");

  return { success: true };
}
