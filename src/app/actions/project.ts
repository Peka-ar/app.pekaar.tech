"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ProjectStatus, Prisma, Role } from "@/generated/prisma/client";
import { requirePrincipal } from "@/lib/auth-guards";

export async function createProject(
  name: string,
  assetIds: string[],
  sku?: string,
  instructions?: string,
  dimensions?: Prisma.InputJsonValue,
) {
  const principal = await requirePrincipal({ roles: [Role.BRAND] });

  const project = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: principal.userId },
      select: { usageLimits: true },
    });
    const projectCount = await tx.project.count({
      where: { brandId: principal.userId },
    });
    if (!user || projectCount >= user.usageLimits) {
      throw new Error("Usage limit exceeded. Please upgrade your plan.");
    }

    const assets = await tx.asset.findMany({
      where: { id: { in: assetIds }, ownerId: principal.userId, status: "READY" as any },
    });
    if (assets.length !== assetIds.length) {
      throw new Error("One or more assets not found or not ready");
    }

    const project = await tx.project.create({
      data: {
        name,
        sku,
        instructions,
        dimensions,
        brandId: principal.userId,
        status: ProjectStatus.PENDING,
      },
    });

    await tx.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { projectId: project.id },
    });

    return project;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/admin/tasks");
  return { success: true, project };
}

export async function brandPublishProject(projectId: string) {
  const principal = await requirePrincipal({ roles: [Role.BRAND] });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.brandId !== principal.userId) {
    throw new Error("Project not found or unauthorized");
  }

  if (project.status !== ProjectStatus.COMPLETED) {
    throw new Error("Only projects awaiting your review can be published");
  }

  const result = await prisma.project.updateMany({
    where: { id: projectId, status: ProjectStatus.COMPLETED, brandId: principal.userId },
    data: { status: ProjectStatus.PUBLISHED },
  });

  if (result.count === 0) {
    throw new Error("Project is not in a publishable state");
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath(`/embed/${projectId}`);
  revalidatePath("/admin/tasks");
  return { success: true };
}

export async function brandSendForRevisions(projectId: string, note: string) {
  const principal = await requirePrincipal({ roles: [Role.BRAND] });

  if (!note || note.trim().length === 0) {
    throw new Error("A note is required when requesting revisions");
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.brandId !== principal.userId) {
    throw new Error("Project not found or unauthorized");
  }

  if (
    project.status !== ProjectStatus.COMPLETED &&
    project.status !== ProjectStatus.PUBLISHED
  ) {
    throw new Error("Revisions can only be requested on completed or published projects");
  }

  const wasPublished = project.status === ProjectStatus.PUBLISHED;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.project.updateMany({
      where: {
        id: projectId,
        brandId: principal.userId,
        status: { in: [ProjectStatus.COMPLETED, ProjectStatus.PUBLISHED] },
      },
      data: { status: ProjectStatus.REVISIONS },
    });

    if (updated.count === 0) {
      throw new Error("Project is not in a revisable state");
    }

    await tx.revisionRequest.create({
      data: {
        projectId,
        note: note.trim(),
        requestedBy: principal.userId,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/admin/tasks");
  if (wasPublished) {
    revalidatePath(`/embed/${projectId}`);
  }
  return { success: true };
}

export async function getUserProjects() {
  const principal = await requirePrincipal();

  const projects = await prisma.project.findMany({
    where: { brandId: principal.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      sku: true,
      instructions: true,
      dimensions: true,
      status: true,
      createdAt: true,
      brand: { select: { id: true, name: true, email: true, role: true, productCategory: true, storefrontPlatform: true, catalogSize: true } },
      assets: { select: { id: true, type: true, url: true, originalName: true, mimeType: true, size: true, status: true } },
      revisionRequests: {
        orderBy: { createdAt: "desc" },
        select: { id: true, note: true, createdAt: true },
      },
    },
  });

  return projects.map((project) => ({
    ...project,
    referenceUrls: project.assets?.filter(a => a.type === 'REFERENCE_IMAGE').map(a => a.url) || [],
    assetUrls: (() => {
      const glb = project.assets?.find(a => a.type === 'MODEL_GLB')?.url;
      const usdz = project.assets?.find(a => a.type === 'MODEL_USDZ')?.url;
      return glb ? { glb, usdz } : null;
    })(),
  }));
}
