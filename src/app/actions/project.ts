"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ProjectStatus, Prisma } from "@prisma/client";

export async function createProject(
  name: string,
  referenceUrls: string[],
  sku?: string,
  instructions?: string,
  dimensions?: Prisma.InputJsonValue,
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { usageLimits: true },
  });

  const projectCount = await prisma.project.count({
    where: { brandId: session.user.id },
  });

  if (!user || projectCount >= user.usageLimits) {
    throw new Error("Usage limit exceeded. Please upgrade your plan.");
  }

  const project = await prisma.project.create({
    data: {
      name,
      sku,
      instructions,
      dimensions,
      referenceUrls,
      brandId: session.user.id,
      status: ProjectStatus.PENDING,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true, project };
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.brandId !== session.user.id) {
    throw new Error("Project not found or unauthorized");
  }

  if (project.status !== ProjectStatus.REVIEW || status !== ProjectStatus.PUBLISHED) {
    throw new Error("Invalid status transition");
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: { status },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true, project: updatedProject };
}

export async function updateSdkConfig(projectId: string, sdkConfig: Prisma.InputJsonValue) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.brandId !== session.user.id) {
    throw new Error("Project not found or unauthorized");
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: { sdkConfig },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true, project: updatedProject };
}

export async function getUserProjects() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const projects = await prisma.project.findMany({
    where: { brandId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      sku: true,
      instructions: true,
      dimensions: true,
      status: true,
      referenceUrls: true,
      assetUrls: true,
      assignedTo: true,
      createdAt: true,
      brand: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const assignedUserIds = projects.flatMap((project) => project.assignedTo ? [project.assignedTo] : []);
  const assignedUsers = await prisma.user.findMany({
    where: { id: { in: assignedUserIds } },
    select: { id: true, name: true, email: true },
  });
  const assignedUserById = new Map(assignedUsers.map((user) => [user.id, user]));

  return projects.map((project) => ({
    ...project,
    assignedUser: project.assignedTo ? assignedUserById.get(project.assignedTo) ?? null : null,
  }));
}
