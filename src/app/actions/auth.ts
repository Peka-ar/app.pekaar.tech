"use server";
import { Account, ID, Query, TablesDB, Users } from "node-appwrite";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePrincipal, Role } from "@/lib/auth-guards";
import {
  createAdminClient,
  createPublicClient,
  createSessionClient,
  SESSION_COOKIE,
} from "@/lib/appwrite";
import { createNextServerHelpers } from "@appwrite.io/react/server/next";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_USERS_TABLE_ID,
} from "@/lib/appwrite-config";

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

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const users = new Users(createAdminClient());
  const existing = await lookupUserByEmail(email);

  if (existing.users.length > 0) {
    const user = existing.users[0];
    if (user.emailVerification) {
      throw new Error("Email already registered");
    }
    await users.updatePassword({ userId: user.$id, password });
    await sendVerificationEmail(user.$id);
    return { email, verificationRequired: true };
  }

  const appwriteUser = await users.create({ userId: ID.unique(), email, password });
  const userId = appwriteUser.$id;

  const tablesDB = new TablesDB(createAdminClient());
  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_USERS_TABLE_ID,
    rowId: userId,
    data: {
      userId,
      email,
      role: "BRAND",
      usageLimits: 10,
      onboarded: false,
      status: "ACTIVE",
    },
  });

  await users.updateLabels({ userId, labels: ["BRAND"] });

  try {
    await sendVerificationEmail(userId);
  } catch (emailError) {
    console.error(
      `[auth] Failed to send verification email to ${email}:`,
      emailError instanceof Error ? emailError.message : emailError
    );
    throw new Error(
      "Account created, but we couldn't send the verification email. Please try submitting again — it will resend the verification link."
    );
  }

  return { email, verificationRequired: true };
}

export async function resendVerificationEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
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
  if (!userId || !secret) {
    throw new Error("Reset link is invalid or expired");
  }

  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  try {
    const account = new Account(createPublicClient());
    await account.updateRecovery({ userId, secret, password });
  } catch {
    throw new Error("Reset link is invalid or expired");
  }

  return { success: true };
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  const principal = await requirePrincipal();

  const companyName = input.companyName.trim();

  if (!companyName.trim()) {
    throw new Error("Company name is required");
  }

  const tablesDB = new TablesDB(createAdminClient());
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_USERS_TABLE_ID,
    rowId: principal.userId,
    data: {
      name: companyName,
      productCategory: optionalText(input.productCategory),
      storefrontPlatform: optionalText(input.storefrontPlatform),
      catalogSize: optionalText(input.catalogSize),
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