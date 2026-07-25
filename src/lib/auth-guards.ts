import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Role, UserStatus } from "@/generated/prisma/client"

export interface Principal {
  userId: string
  email: string
  role: Role
  onboarded: boolean
  companyName: string | null
}

export class UnauthenticatedError extends Error {
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "UnauthenticatedError"
  }
}

export class StaleSessionError extends UnauthenticatedError {
  constructor(message = "Your session is no longer valid. Please sign in again.") {
    super(message)
    this.name = "StaleSessionError"
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message)
    this.name = "ForbiddenError"
  }
}

export interface RequirePrincipalOptions {
  roles?: Role[]
  requireOnboarded?: boolean
}

export async function requirePrincipal(options?: RequirePrincipalOptions): Promise<Principal> {
  const session = await auth()
  if (!session?.user) {
    throw new UnauthenticatedError()
  }
  const sessionId = session.user.id
  const sessionEmail = session.user.email
  let user: { id: string; email: string; role: Role; onboarded: boolean; name: string | null; status: UserStatus } | null = null
  if (sessionId) {
    user = await prisma.user.findUnique({
      where: { id: sessionId },
      select: { id: true, email: true, role: true, onboarded: true, name: true, status: true },
    })
  }
  if (!user && sessionEmail) {
    user = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true, email: true, role: true, onboarded: true, name: true, status: true },
    })
  }
  if (!user) {
    throw new StaleSessionError()
  }
  if (user.status === 'SUSPENDED') {
    throw new ForbiddenError("Account suspended")
  }
  const principal: Principal = {
    userId: user.id,
    email: user.email,
    role: user.role,
    onboarded: user.onboarded,
    companyName: user.name,
  }
  if (options?.roles && !options.roles.includes(user.role)) {
    throw new ForbiddenError("Forbidden: insufficient role")
  }
  if (options?.requireOnboarded && !user.onboarded) {
    throw new ForbiddenError("Forbidden: onboarding required")
  }
  return principal
}

export async function requirePrincipalOrRedirect(options?: RequirePrincipalOptions): Promise<Principal> {
  try {
    return await requirePrincipal(options)
  } catch (error) {
    if (error instanceof StaleSessionError) {
      redirect("/api/auth/clear-session")
    }
    if (error instanceof UnauthenticatedError) {
      redirect("/auth")
    }
    if (error instanceof ForbiddenError) {
      const session = await auth();
      const role = (session?.user as { role?: string } | undefined)?.role;
      redirect(role === "ADMIN" ? "/admin/dashboard" : "/dashboard")
    }
    throw error
  }
}
