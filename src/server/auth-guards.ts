import { cache } from "react";
import { redirect } from "next/navigation";
import { createNextServerHelpers } from "@appwrite.io/react/server/next";
import { Models, TablesDB } from "node-appwrite";
import { createAdminClient } from "@/server/appwrite";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_USERS_TABLE_ID,
} from "@/lib/appwrite-config";
import {
  ForbiddenError,
  StaleSessionError,
  UnauthenticatedError,
} from "@/server/http/errors";

import { Role } from "@/lib/enums";

export { Role } from "@/lib/enums";
export { ForbiddenError, StaleSessionError, UnauthenticatedError };

export interface Principal {
  userId: string
  email: string
  role: Role
  onboarded: boolean
  companyName: string | null
}

export interface RequirePrincipalOptions {
  roles?: Role[]
  requireOnboarded?: boolean
  /** Render for a not-yet-onboarded principal instead of redirecting to /onboarding. */
  allowUnonboarded?: boolean
}

interface UsersRow {
  $id: string
  userId?: string
  email: string
  role: string
  onboarded: boolean
  name: string | null
  status: string
}

async function getSessionPrincipalData(): Promise<Principal> {
  let sessionUser: Models.User<Models.Preferences> | null = null;
  try {
    sessionUser = await createNextServerHelpers({ endpoint: APPWRITE_ENDPOINT, projectId: APPWRITE_PROJECT_ID }).getLoggedInUser();
  } catch {
    sessionUser = null;
  }
  if (!sessionUser) {
    throw new UnauthenticatedError()
  }

  let user: UsersRow | null = null
  try {
    const tablesDB = new TablesDB(createAdminClient())
    user = (await tablesDB.getRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: APPWRITE_USERS_TABLE_ID,
      rowId: sessionUser.$id,
    })) as unknown as UsersRow
  } catch {
    user = null
  }
  if (!user) {
    throw new StaleSessionError()
  }
  if (user.status === 'SUSPENDED') {
    throw new ForbiddenError("Account suspended")
  }
  return {
    userId: user.userId || user.$id,
    email: user.email,
    role: user.role as Role,
    onboarded: user.onboarded,
    companyName: user.name ?? null,
  }
}

const getSessionPrincipal = cache(getSessionPrincipalData);

export async function requirePrincipal(options?: RequirePrincipalOptions): Promise<Principal> {
  const principal = await getSessionPrincipal()
  if (options?.roles && !options.roles.includes(principal.role)) {
    throw new ForbiddenError("Forbidden: insufficient role")
  }
  if (options?.requireOnboarded && !principal.onboarded) {
    throw new ForbiddenError("Forbidden: onboarding required")
  }
  return principal
}

export async function requirePrincipalOrRedirect(options?: RequirePrincipalOptions): Promise<Principal> {
  try {
    const principal = await requirePrincipal(options)
    if (!principal.onboarded && !options?.allowUnonboarded) {
      redirect("/onboarding")
    }
    return principal
  } catch (error) {
    if (error instanceof StaleSessionError || error instanceof UnauthenticatedError) {
      redirect("/auth")
    }
    if (error instanceof ForbiddenError) {
      if (error.message === "Account suspended") {
        redirect("/auth")
      }
      redirect("/dashboard")
    }
    throw error
  }
}
