"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ProjectStatus, Role } from "@/generated/prisma/client";
import { requirePrincipal } from "@/lib/auth-guards";

export async function getAllTasks() {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const tasks = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      sku: true,
      instructions: true,
      dimensions: true,
      status: true,
      brandId: true,
      createdAt: true,
      updatedAt: true,
      sdkConfig: true,
      brand: { select: { id: true, name: true, email: true, role: true, productCategory: true, storefrontPlatform: true, catalogSize: true } },
      assets: { select: { id: true, type: true, url: true, originalName: true, mimeType: true, size: true, status: true } },
      revisionRequests: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          note: true,
          createdAt: true,
          requester: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return tasks.map((task) => ({
    ...task,
    referenceUrls: task.assets?.filter(a => a.type === 'REFERENCE_IMAGE').map(a => a.url) || [],
    assetUrls: (() => {
      const glb = task.assets?.find(a => a.type === 'MODEL_GLB')?.url;
      const usdz = task.assets?.find(a => a.type === 'MODEL_USDZ')?.url;
      return glb ? { glb, usdz } : null;
    })(),
  }));
}

export async function adminSubmitProject(
  projectId: string,
  glbAssetId: string,
  usdzAssetId?: string,
) {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const glbAsset = await prisma.asset.findUnique({ where: { id: glbAssetId } });
  if (!glbAsset || glbAsset.type !== "MODEL_GLB" || glbAsset.status !== "READY") {
    throw new Error("GLB asset not found or not ready");
  }

  if (usdzAssetId) {
    const usdzAsset = await prisma.asset.findUnique({ where: { id: usdzAssetId } });
    if (!usdzAsset || usdzAsset.type !== "MODEL_USDZ" || usdzAsset.status !== "READY") {
      throw new Error("USDZ asset not found or not ready");
    }
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { status: true, brandId: true },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  if (
    project.status !== ProjectStatus.PENDING &&
    project.status !== ProjectStatus.REVISIONS
  ) {
    throw new Error("Project is not in a submittable state");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.project.updateMany({
      where: {
        id: projectId,
        status: { in: [ProjectStatus.PENDING, ProjectStatus.REVISIONS] },
      },
      data: {
        status: ProjectStatus.COMPLETED,
      },
    });

    if (updated.count === 0) {
      throw new Error("Project is no longer available to submit");
    }

    const assetIdsToLink = [glbAssetId, usdzAssetId].filter(Boolean) as string[];
    if (assetIdsToLink.length > 0) {
      await tx.asset.updateMany({
        where: {
          id: { in: assetIdsToLink },
          projectId: null,
        },
        data: { projectId },
      });
    }

    return updated;
  });

  void result;

  revalidatePath("/tasks");
  revalidatePath("/admin/tasks");
  return { success: true };
}
