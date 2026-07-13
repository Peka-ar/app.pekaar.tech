"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ProjectStatus, Prisma, Role } from "@prisma/client";

type SessionUserWithRole = {
  role?: Role;
};

export async function getAllTasks() {
  const session = await auth();
  if (!session?.user?.id || (session.user as SessionUserWithRole).role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  const tasks = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { brand: { select: { id: true, name: true, email: true, role: true, productCategory: true, storefrontPlatform: true, catalogSize: true } } },
  });

  const assignedUserIds = tasks.flatMap((task) => task.assignedTo ? [task.assignedTo] : []);
  const assignedUsers = await prisma.user.findMany({
    where: { id: { in: assignedUserIds } },
    select: { id: true, name: true, email: true },
  });
  const assignedUserById = new Map(assignedUsers.map((user) => [user.id, user]));

  return tasks.map((task) => ({
    ...task,
    assignedUser: task.assignedTo ? assignedUserById.get(task.assignedTo) ?? null : null,
  }));
}

export async function claimProject(projectId: string) {
  const session = await auth();
  if (!session?.user?.id || (session.user as SessionUserWithRole).role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      assignedTo: session.user.id,
      status: ProjectStatus.IN_PROGRESS,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/admin/tasks"); // Assuming admin might have a separate route
  return { success: true, project };
}

export async function submitForReview(projectId: string, assetUrls: Prisma.InputJsonValue) {
  const session = await auth();
  if (!session?.user?.id || (session.user as SessionUserWithRole).role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  const existingProject = await prisma.project.findUnique({
    where: { id: projectId },
    select: { status: true },
  });

  if (!existingProject || existingProject.status !== ProjectStatus.IN_PROGRESS) {
    throw new Error("Project must be in progress before review submission");
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      status: ProjectStatus.REVIEW,
      assetUrls,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/admin/tasks");
  return { success: true, project };
}
