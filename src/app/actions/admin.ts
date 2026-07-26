"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ProjectStatus, Role, AssetStatus, AssetType } from "@/generated/prisma/client";
import { requirePrincipal } from "@/lib/auth-guards";
import { utapi } from "@/lib/uploadthing-server";

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
      assets: {
        select: {
          id: true,
          type: true,
          url: true,
          originalName: true,
          mimeType: true,
          size: true,
          status: true,
          key: true,
          gdriveFileId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
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

  return tasks.map((task) => {
    const liveGlb = task.assets?.find((a) => a.type === 'MODEL_GLB' && a.status === 'READY');
    const liveUsdz = task.assets?.find((a) => a.type === 'MODEL_USDZ' && a.status === 'READY');
    const archivedGlbs = (task.assets || [])
      .filter((a) => a.type === 'MODEL_GLB' && a.status === 'ARCHIVED')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const archivedUsdzs = (task.assets || [])
      .filter((a) => a.type === 'MODEL_USDZ' && a.status === 'ARCHIVED')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return {
      ...task,
      referenceUrls: task.assets?.filter((a) => a.type === 'REFERENCE_IMAGE').map((a) => `/api/v1/assets/${a.id}/file`) || [],
      assetUrls: liveGlb
        ? {
            glb: `/api/v1/assets/${liveGlb.id}/file`,
            usdz: liveUsdz ? `/api/v1/assets/${liveUsdz.id}/file` : undefined,
          }
        : null,
      archivedAssetUrls: {
        glb: archivedGlbs.map((a) => ({ ...a, url: `/api/v1/assets/${a.id}/file` })),
        usdz: archivedUsdzs.map((a) => ({ ...a, url: `/api/v1/assets/${a.id}/file` })),
      },
    };
  });
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

  const { archivedKeys } = await prisma.$transaction(async (tx) => {
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

    const existing = await tx.asset.findMany({
      where: {
        projectId,
        type: { in: [AssetType.MODEL_GLB, AssetType.MODEL_USDZ] },
        status: AssetStatus.READY,
        id: { notIn: [glbAssetId, ...(usdzAssetId ? [usdzAssetId] : [])] },
      },
      select: { id: true, key: true },
    });

    const archivedKeys: string[] = [];
    if (existing.length > 0) {
      await tx.asset.updateMany({
        where: { id: { in: existing.map((e) => e.id) } },
        data: { status: AssetStatus.ARCHIVED },
      });
      archivedKeys.push(...existing.map((e) => e.key));
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

    return { archivedKeys };
  });

  if (archivedKeys.length > 0) {
    void utapi.deleteFiles(archivedKeys).catch((err) => {
      console.error(`[uploadthing] failed to delete archived keys:`, archivedKeys, err);
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/admin/tasks");
  return { success: true };
}