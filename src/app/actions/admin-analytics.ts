"use server";

import { Query } from "node-appwrite";
import { requirePrincipal, Role } from "@/lib/auth-guards";
import {
  DB,
  countRows,
  listAllRows,
  ProjectStatus,
  UserStatus,
  UsersRow,
  ProjectsRow,
} from "@/lib/db";
import { startOfMonth } from "date-fns";

export async function getPlatformKPIs() {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const monthStart = startOfMonth(new Date()).toISOString();

  const [
    totalUsers,
    suspendedUsers,
    totalProjects,
    totalEvents,
    signupsThisMonth,
    eventsThisMonth,
  ] = await Promise.all([
    countRows(DB.users),
    countRows(DB.users, [Query.equal("status", UserStatus.SUSPENDED)]),
    countRows(DB.projects),
    countRows(DB.analyticsEvents),
    countRows(DB.users, [Query.greaterThanEqual("$createdAt", monthStart)]),
    countRows(DB.analyticsEvents, [Query.greaterThanEqual("$createdAt", monthStart)]),
  ]);

  const statuses = [
    ProjectStatus.PENDING,
    ProjectStatus.REVISIONS,
    ProjectStatus.COMPLETED,
    ProjectStatus.PUBLISHED,
  ];
  const statusCounts = await Promise.all(
    statuses.map((status) => countRows(DB.projects, [Query.equal("status", status)])),
  );
  const projectsByStatus = statuses.map((status, i) => ({
    status,
    _count: statusCounts[i],
  }));

  return {
    totalUsers,
    totalProjects,
    totalEvents,
    suspendedUsers,
    projectsByStatus,
    signupsThisMonth,
    eventsThisMonth,
  };
}

export async function getSignupsSeries(months: number = 12) {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const now = new Date();
  const labels: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const since = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const users = await listAllRows<UsersRow>(DB.users, [
    Query.greaterThanEqual("$createdAt", since.toISOString()),
  ]);

  const counts = labels.map(() => 0);
  for (const u of users) {
    const d = new Date(u.$createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const idx = labels.indexOf(key);
    if (idx >= 0) counts[idx]++;
  }

  return { labels, counts };
}

export async function getProjectsByMonth(months: number = 12) {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const now = new Date();
  const labels: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const since = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const projects = await listAllRows<ProjectsRow>(DB.projects, [
    Query.greaterThanEqual("$createdAt", since.toISOString()),
  ]);

  const counts = labels.map(() => 0);
  for (const p of projects) {
    const d = new Date(p.$createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const idx = labels.indexOf(key);
    if (idx >= 0) counts[idx]++;
  }

  return { labels, counts };
}

export async function getTopBrands(take: number = 10) {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const [brands, projects] = await Promise.all([
    listAllRows<UsersRow>(DB.users, [Query.equal("role", Role.BRAND)]),
    listAllRows<ProjectsRow>(DB.projects),
  ]);

  const projectCounts = new Map<string, number>();
  for (const p of projects) {
    projectCounts.set(p.brandId, (projectCounts.get(p.brandId) ?? 0) + 1);
  }

  return brands
    .map((b) => ({
      id: b.$id,
      name: b.name,
      email: b.email,
      status: b.status,
      createdAt: b.$createdAt,
      _count: { projects: projectCounts.get(b.$id) ?? 0 },
    }))
    .sort((a, b) => b._count.projects - a._count.projects)
    .slice(0, take);
}