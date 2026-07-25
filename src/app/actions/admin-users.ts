"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Role, UserStatus, Prisma } from "@/generated/prisma/client";
import { requirePrincipal } from "@/lib/auth-guards";

export async function adminGetUsers(
  search?: string,
  roleFilter?: Role,
  statusFilter?: UserStatus,
  page?: number,
) {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
      { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
    ];
  }
  if (roleFilter) where.role = roleFilter;
  if (statusFilter) where.status = statusFilter;

  const currentPage = page || 1;
  const take = 50;
  const skip = (currentPage - 1) * take;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        usageLimits: true,
        subscriptionTier: true,
        createdAt: true,
        onboarded: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page: currentPage, totalPages: Math.ceil(total / take) };
}

export async function adminGetUser(id: string) {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const userData = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      usageLimits: true,
      subscriptionTier: true,
      createdAt: true,
      onboarded: true,
      statusReason: true,
      suspendedAt: true,
      _count: {
        select: {
          projects: true,
          assets: true,
          analyticsEvents: true,
        },
      },
    },
  });

  if (!userData) throw new Error("User not found");

  const recentProjects = await prisma.project.findMany({
    where: { brandId: id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, status: true, createdAt: true },
  });

  const { _count, ...user } = userData;
  return {
    user: {
      ...user,
      projectCount: _count.projects,
      assetCount: _count.assets,
      eventCount: _count.analyticsEvents,
      recentProjects,
    },
  };
}

export async function adminUpdateUser(
  id: string,
  data: { role?: Role; usageLimits?: number; subscriptionTier?: string },
) {
  const principal = await requirePrincipal({ roles: [Role.ADMIN] });

  if (id === principal.userId) throw new Error("Cannot update your own account");

  await prisma.user.update({ where: { id }, data });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function adminSetUserStatus(id: string, status: UserStatus, reason?: string) {
  const principal = await requirePrincipal({ roles: [Role.ADMIN] });

  if (id === principal.userId) throw new Error("Cannot suspend your own account");

  await prisma.user.update({
    where: { id },
    data: {
      status,
      statusReason: reason || null,
      suspendedAt: status === UserStatus.SUSPENDED ? new Date() : null,
    },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function adminDeleteUser(id: string) {
  const principal = await requirePrincipal({ roles: [Role.ADMIN] });

  if (id === principal.userId) throw new Error("Cannot delete your own account");

  await prisma.user.delete({ where: { id } });

  revalidatePath("/admin/users");
  return { success: true };
}
