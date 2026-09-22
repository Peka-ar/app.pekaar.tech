"use server";
import { Account, ID, Query, TablesDB, Users } from "node-appwrite";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePrincipal, Role } from "@/server/auth-guards";
import {
  createAdminClient,
  createPublicClient,
  createSessionClient,
  SESSION_COOKIE,
} from "@/server/appwrite";
import { createNextServerHelpers } from "@appwrite.io/react/server/next";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_USERS_TABLE_ID,
} from "@/lib/appwrite-config";
import { signupSchema, resetPasswordSchema, onboardingSchema } from "@/server/http/schemas";
import { enforceRateLimit, rateLimitKey } from "@/server/http/rate-limit";
import { clientIpForAction } from "@/server/http/ip";

type CompleteOnboardingInput = {
  companyName: string;
  productCategory?: string;
  storefrontPlatform?: string;
  catalogSize?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function lookupUserByEmail(email: string) {
  const users = new Users(createAdminClient());
  return users.list({ queries: [Query.equal("email", email)] });
}

async function sendVerificationEmail(userId: string) {
  const users = new Users(createAdminClient());
  const session = await users.createSession({ userId });
  try {
    const account = new Account(createSessionClient(session.secret));
    await account.createVerification({ url: `${appUrl()}/auth/verify` });
  } finally {
    try {
      await users.deleteSession({ userId, sessionId: session.$id });
    } catch (cleanupError) {
      console.error(`[auth] Failed to clean up minted session for ${userId}:`, cleanupError);
    }
  }
}

export async function registerUser(formData: FormData) {
  const email = normalizeEmail(formData.get("email") as string);
  const password = formData.get("password") as string;

  const parsed = signupSchema.safeParse({ email, password });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid email or password");
  }

  const ip = await clientIpForAction();
  await enforceRateLimit(rateLimitKey("register", ip), { limit: 10, windowSeconds: 3600 });

  const users = new Users(createAdminClient());
  const existing = await lookupUserByEmail(parsed.data.email);

  if (existing.users.length > 0) {
    const user = existing.users[0];
    if (user.emailVerification) {
      throw new Error("Email already registered");
    }
    // Account-takeover guard: NEVER overwrite the password on an existing
    // account — even an unverified one. Re-send the verification email only;
    // password recovery is handled by requestPasswordReset.
    await sendVerificationEmail(user.$id);
    return { email: parsed.data.email, verificationRequired: true };
  }

  const appwriteUser = await users.create({
    userId: ID.unique(),
    email: parsed.data.email,
    password: parsed.data.password,
  });
  const userId = appwriteUser.$id;

  const tablesDB = new TablesDB(createAdminClient());
  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_USERS_TABLE_ID,
    rowId: userId,
    data: {
      userId,
      email: parsed.data.email,
      role: "BRAND",
      usageLimits: 6,
      subscriptionTier: "FREE",
      creditsRenewedAt: new Date().toISOString(),
      onboarded: false,
      status: "ACTIVE",
    },
  });

  await users.updateLabels({ userId, labels: ["BRAND"] });

  try {
    await sendVerificationEmail(userId);
  } catch (emailError) {
    console.error(
      `[auth] Failed to send verification email to ${parsed.data.email}:`,
      emailError instanceof Error ? emailError.message : emailError
    );
    throw new Error(
      "Account created, but we couldn't send the verification email. Please try submitting again — it will resend the verification link."
    );
  }

  return { email: parsed.data.email, verificationRequired: true };
}

export async function resendVerificationEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const ip = await clientIpForAction();
  await enforceRateLimit(rateLimitKey("resend-verify-ip", ip), { limit: 10, windowSeconds: 3600 });
  await enforceRateLimit(rateLimitKey("resend-verify", normalizedEmail), { limit: 5, windowSeconds: 3600 });

  const existing = await lookupUserByEmail(normalizedEmail);
  const user = existing.users[0];

  if (!user || user.emailVerification) {
    return { success: false, status: "invalid" as const };
  }

  await sendVerificationEmail(user.$id);
  return { success: true, status: "sent" as const };
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const ip = await clientIpForAction();
  await enforceRateLimit(rateLimitKey("password-reset-ip", ip), { limit: 10, windowSeconds: 3600 });
  await enforceRateLimit(rateLimitKey("password-reset", normalizedEmail), { limit: 3, windowSeconds: 3600 });

  try {
    const account = new Account(createPublicClient());
    await account.createRecovery({ email: normalizedEmail, url: `${appUrl()}/auth/reset-password` });
  } catch (error) {
    console.error(
      `[auth] Failed to send password reset email to ${email}:`,
      error instanceof Error ? error.message : error
    );
  }

  return { success: true };
}

export async function resetPassword(userId: string, secret: string, password: string) {
  const parsed = resetPasswordSchema.safeParse({ userId, secret, password });
  if (!parsed.success) {
    throw new Error("Reset link is invalid or expired");
  }

  try {
    const account = new Account(createPublicClient());
    await account.updateRecovery({
      userId: parsed.data.userId,
      secret: parsed.data.secret,
      password: parsed.data.password,
    });
  } catch {
    throw new Error("Reset link is invalid or expired");
  }

  return { success: true };
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  const principal = await requirePrincipal();

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid onboarding data");
  }

  const tablesDB = new TablesDB(createAdminClient());
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_USERS_TABLE_ID,
    rowId: principal.userId,
    data: {
      name: parsed.data.companyName,
      productCategory: optionalText(parsed.data.productCategory),
      storefrontPlatform: optionalText(parsed.data.storefrontPlatform),
      catalogSize: optionalText(parsed.data.catalogSize),
      onboarded: true,
    },
  });

  await new Users(createAdminClient()).updateLabels({ userId: principal.userId, labels: [principal.role] });

  revalidatePath("/auth");
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/integrations");

  return { success: true };
}

export async function getSessionPrincipal(): Promise<{
  onboarded: boolean;
  role: Role;
  sessionSecret: string;
} | null> {
  try {
    const principal = await requirePrincipal();
    const helpers = createNextServerHelpers({ endpoint: APPWRITE_ENDPOINT, projectId: APPWRITE_PROJECT_ID });
    const sessionSecret = await helpers.readSessionCookie();
    if (!sessionSecret) return null;
    return { onboarded: principal.onboarded, role: principal.role, sessionSecret };
  } catch {
    return null;
  }
}

export async function logout() {
  const helpers = createNextServerHelpers({ endpoint: APPWRITE_ENDPOINT, projectId: APPWRITE_PROJECT_ID });
  const secret = await helpers.readSessionCookie();
  if (secret) {
    try {
      const account = new Account(createSessionClient(secret));
      await account.deleteSession({ sessionId: "current" });
    } catch (error) {
      console.error("[auth] Failed to delete Appwrite session on logout:", error);
    }
    (await cookies()).delete(SESSION_COOKIE);
  }
  redirect("/");
}