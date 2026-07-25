"use server";

import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { requirePrincipal } from "@/lib/auth-guards";
import { startOfMonth, addMonths } from "date-fns";

export async function getPlatformKPIs() {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const [
    totalUsers,
    suspendedUsers,
    totalProjects,
    totalEvents,
    projectsByStatus,
    signupsThisMonth,
    eventsThisMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "SUSPENDED" as const } }),
    prisma.project.count(),
    prisma.analyticsEvent.count(),
    prisma.project.groupBy({ by: ["status"], _count: true }),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth(new Date()) } } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: startOfMonth(new Date()) } } }),
  ]);

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

  const labels: string[] = [];
  const counts: number[] = [];

  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = startOfMonth(addMonths(now, -i));
    const nextMonthStart = startOfMonth(addMonths(now, -(i - 1)));

    const count = await prisma.user.count({
      where: {
        createdAt: { gte: monthStart, lt: nextMonthStart },
      },
    });

    labels.push(monthStart.toISOString().slice(0, 7));
    counts.push(count);
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

  const projects = await prisma.project.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const counts = labels.map(() => 0);
  for (const p of projects) {
    const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const idx = labels.indexOf(key);
    if (idx >= 0) counts[idx]++;
  }

  return { labels, counts };
}

export async function getTopBrands(take: number = 10) {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const brands = await prisma.user.findMany({
    where: { role: Role.BRAND },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
  });

  brands.sort((a, b) => b._count.projects - a._count.projects);
  return brands.slice(0, take);
}
