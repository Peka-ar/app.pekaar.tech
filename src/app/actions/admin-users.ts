"use server";

import { revalidatePath } from "next/cache";
import { Query, Users } from "node-appwrite";
import { requirePrincipal, Role } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/appwrite";
import {
  DB,
  getTablesDB,
  getRowSafe,
  listAllRows,
  countRows,
  runTransaction,
  UserStatus,
  UsersRow,
  ProjectsRow,
} from "@/lib/db";

export async function adminGetUsers(
  search?: string,
  roleFilter?: Role,
  statusFilter?: UserStatus,
  page?: number,
) {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const queries: string[] = [Query.orderDesc("$createdAt")];
  if (roleFilter) queries.push(Query.equal("role", roleFilter));
  if (statusFilter) queries.push(Query.equal("status", statusFilter));

  const all = await listAllRows<UsersRow>(DB.users, queries);

  const filtered = search
    ? all.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.name ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : all;

  const take = 50;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / take));
  const currentPage = Math.min(Math.max(1, page || 1), totalPages);
  const start = (currentPage - 1) * take;

  const users = filtered.slice(start, start + take).map((u) => ({
    id: u.$id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    usageLimits: u.usageLimits,
    subscriptionTier: u.subscriptionTier,
    createdAt: u.$createdAt,
    onboarded: u.onboarded,
  }));

  return { users, total, page: currentPage, totalPages };
}

export async function adminGetUser(id: string) {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const user = await getRowSafe<UsersRow>(DB.users, id);
  if (!user) throw new Error("User not found");

  const [projectCount, assetCount, eventCount, recentRows] = await Promise.all([
    countRows(DB.projects, [Query.equal("brandId", id)]),
    countRows(DB.assets, [Query.equal("ownerId", id)]),
    countRows(DB.analyticsEvents, [Query.equal("brandId", id)]),
    getTablesDB().listRows<ProjectsRow>({
      databaseId: DB.databaseId,
      tableId: DB.projects,
      queries: [Query.equal("brandId", id), Query.orderDesc("$createdAt"), Query.limit(5)],
      total: false,
    }),
  ]);

  return {
    user: {
      id: user.$id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      usageLimits: user.usageLimits,
      subscriptionTier: user.subscriptionTier,
      createdAt: user.$createdAt,
      onboarded: user.onboarded,
      statusReason: user.statusReason,
      suspendedAt: user.suspendedAt,
      projectCount,
      assetCount,
      eventCount,
      recentProjects: recentRows.rows.map((p) => ({
        id: p.$id,
        name: p.name,
        status: p.status,
        createdAt: p.$createdAt,
      })),
    },
  };
}

export async function adminUpdateUser(
  id: string,
  data: { role?: Role; usageLimits?: number; subscriptionTier?: string },
) {
  const principal = await requirePrincipal({ roles: [Role.ADMIN] });

  if (id === principal.userId) throw new Error("Cannot update your own account");

  const result = await getTablesDB().updateRows<UsersRow>({
    databaseId: DB.databaseId,
    tableId: DB.users,
    queries: [Query.equal("$id", id)],
    data,
  });

  if (result.rows.length === 0) throw new Error("User not found");

  revalidatePath("/admin/users");
  return { success: true };
}

export async function adminSetUserStatus(id: string, status: UserStatus, reason?: string) {
  const principal = await requirePrincipal({ roles: [Role.ADMIN] });

  if (id === principal.userId) throw new Error("Cannot suspend your own account");

  const result = await getTablesDB().updateRows<UsersRow>({
    databaseId: DB.databaseId,
    tableId: DB.users,
    queries: [Query.equal("$id", id)],
    data: {
      status,
      statusReason: reason || null,
      suspendedAt: status === UserStatus.SUSPENDED ? new Date().toISOString() : null,
    },
  });

  if (result.rows.length === 0) throw new Error("User not found");

  revalidatePath("/admin/users");
  return { success: true };
}

export async function adminDeleteUser(id: string) {
  const principal = await requirePrincipal({ roles: [Role.ADMIN] });

  if (id === principal.userId) throw new Error("Cannot delete your own account");

  await runTransaction(async (db, txId) => {
    const projects = await db.listRows<ProjectsRow>({
      databaseId: DB.databaseId,
      tableId: DB.projects,
      queries: [Query.equal("brandId", id)],
      transactionId: txId,
    });
    const projectIds = projects.rows.map((p) => p.$id);

    await db.deleteRows({
      databaseId: DB.databaseId,
      tableId: DB.projects,
      queries: [Query.equal("brandId", id)],
      transactionId: txId,
    });

    const assetQueries = projectIds.length > 0
      ? Query.or([Query.equal("ownerId", id), Query.equal("projectId", projectIds)])
      : Query.equal("ownerId", id);
    await db.deleteRows({
      databaseId: DB.databaseId,
      tableId: DB.assets,
      queries: [assetQueries],
      transactionId: txId,
    });

    const eventQueries = projectIds.length > 0
      ? Query.or([Query.equal("brandId", id), Query.equal("projectId", projectIds)])
      : Query.equal("brandId", id);
    await db.deleteRows({
      databaseId: DB.databaseId,
      tableId: DB.analyticsEvents,
      queries: [eventQueries],
      transactionId: txId,
    });

    const revisionQueries = projectIds.length > 0
      ? Query.or([Query.equal("requestedBy", id), Query.equal("projectId", projectIds)])
      : Query.equal("requestedBy", id);
    await db.deleteRows({
      databaseId: DB.databaseId,
      tableId: DB.revisionRequests,
      queries: [revisionQueries],
      transactionId: txId,
    });

    await db.deleteRows({
      databaseId: DB.databaseId,
      tableId: DB.users,
      queries: [Query.equal("$id", id)],
      transactionId: txId,
    });
  });

  try {
    await new Users(createAdminClient()).delete(id);
  } catch (err) {
    console.error(`[admin-users] failed to delete Appwrite user ${id}:`, err);
  }

  revalidatePath("/admin/users");
  return { success: true };
}