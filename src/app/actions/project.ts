"use server";

import { revalidatePath } from "next/cache";
import { ID, Permission, Query, Role as AppwriteRole, Storage } from "node-appwrite";
import { requirePrincipal, Role } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/appwrite";
import { bucketForAssetType } from "@/lib/appwrite-config";
import {
  DB,
  getTablesDB,
  getRowSafe,
  listAllRows,
  runTransaction,
  ProjectStatus,
  AssetStatus,
  AssetType,
  AssetsRow,
  ProjectsRow,
  RevisionRequestRow,
  UsersRow,
} from "@/lib/db";
import {
  buildTaskJob,
  TaskJob,
  usersToTaskBrand,
} from "@/lib/project-augment";

export async function createProject(
  name: string,
  assetIds: string[],
  sku?: string,
  instructions?: string,
  dimensions?: Record<string, unknown> | null,
): Promise<{ success: true; projectId: string; remaining: number }> {
  const principal = await requirePrincipal({ roles: [Role.BRAND] });

  const user = await getRowSafe<UsersRow>(DB.users, principal.userId);
  if (!user || !user.usageLimits || user.usageLimits <= 0) {
    throw new Error("Usage limit exceeded. Please upgrade your plan.");
  }

  const project = await runTransaction(async (db, txId) => {
    let remaining: number;
    try {
      const row = await db.decrementRowColumn<UsersRow>({
        databaseId: DB.databaseId,
        tableId: DB.users,
        rowId: principal.userId,
        column: "usageLimits",
        value: 1,
        min: 0,
        transactionId: txId,
      });
      remaining = row.usageLimits ?? 0;
    } catch {
      throw new Error("Usage limit exceeded. Please upgrade your plan.");
    }

    let matchedCount = 0;
    if (assetIds.length > 0) {
      const matched = await db.listRows<AssetsRow>({
        databaseId: DB.databaseId,
        tableId: DB.assets,
        queries: [
          Query.equal("$id", assetIds),
          Query.equal("ownerId", principal.userId),
          Query.equal("status", AssetStatus.READY),
        ],
        transactionId: txId,
      });
      matchedCount = matched.total;
    }
    if (matchedCount !== assetIds.length) {
      throw new Error("One or more assets not found or not ready");
    }

    const projectId = ID.unique();
    const created = await db.createRow<ProjectsRow>({
      databaseId: DB.databaseId,
      tableId: DB.projects,
      rowId: projectId,
      data: {
        name,
        sku: sku ?? null,
        instructions: instructions ?? null,
        dimensions: dimensions ? JSON.stringify(dimensions) : null,
        status: ProjectStatus.PENDING,
        sdkConfig: null,
        brandId: principal.userId,
      },
      transactionId: txId,
    });

    if (assetIds.length > 0) {
      await db.updateRows<AssetsRow>({
        databaseId: DB.databaseId,
        tableId: DB.assets,
        queries: [Query.equal("$id", assetIds)],
        data: { projectId },
        transactionId: txId,
      });
    }

    return { created, remaining };
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/admin/tasks");
  // Return a plain object — never the raw Appwrite row, whose prototype/metadata
  // (`$permissions`, `$sequence`, …) breaks Next.js's Server→Client serialization.
  return { success: true, projectId: project.created.$id, remaining: project.remaining };
}

export async function brandPublishProject(projectId: string) {
  const principal = await requirePrincipal({ roles: [Role.BRAND] });

  const project = await getRowSafe<ProjectsRow>(DB.projects, projectId);
  if (!project || project.brandId !== principal.userId) {
    throw new Error("Project not found or unauthorized");
  }

  if (project.status !== ProjectStatus.COMPLETED) {
    throw new Error("Only projects awaiting your review can be published");
  }

  const modelAssets = await listAppwriteModelAssets(projectId);

  // Grant read:any BEFORE the status flip so the invariant "PUBLISHED => public" holds.
  const granted = await Promise.allSettled(
    modelAssets.map((a) => setFilePublic(a, true)),
  );
  for (const [i, result] of granted.entries()) {
    if (result.status === "rejected") {
      console.error(`[storage] failed to grant read:any on asset=${modelAssets[i].$id}`, result.reason);
    }
  }

  const result = await getTablesDB().updateRows<ProjectsRow>({
    databaseId: DB.databaseId,
    tableId: DB.projects,
    queries: [
      Query.equal("$id", projectId),
      Query.equal("status", ProjectStatus.COMPLETED),
      Query.equal("brandId", principal.userId),
    ],
    data: { status: ProjectStatus.PUBLISHED },
  });

  if (result.rows.length === 0) {
    await Promise.allSettled(modelAssets.map((a) => setFilePublic(a, false)));
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

  const project = await getRowSafe<ProjectsRow>(DB.projects, projectId);
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

  await runTransaction(async (db, txId) => {
    const current = await getRowSafe<ProjectsRow>(DB.projects, projectId, txId);
    if (
      !current ||
      current.brandId !== principal.userId ||
      (current.status !== ProjectStatus.COMPLETED && current.status !== ProjectStatus.PUBLISHED)
    ) {
      throw new Error("Project is not in a revisable state");
    }

    await db.updateRow<ProjectsRow>({
      databaseId: DB.databaseId,
      tableId: DB.projects,
      rowId: projectId,
      data: { status: ProjectStatus.REVISIONS },
      transactionId: txId,
    });

    await db.createRow<RevisionRequestRow>({
      databaseId: DB.databaseId,
      tableId: DB.revisionRequests,
      rowId: ID.unique(),
      data: {
        projectId,
        note: note.trim(),
        requestedBy: principal.userId,
      },
      transactionId: txId,
    });
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/admin/tasks");
  if (wasPublished) {
    const modelAssets = await listAppwriteModelAssets(projectId);
    const revocations = await Promise.allSettled(modelAssets.map((a) => setFilePublic(a, false)));
    for (const [i, result] of revocations.entries()) {
      if (result.status === "rejected") {
        console.error(`[storage] failed to revoke read:any on asset=${modelAssets[i].$id}`, result.reason);
      }
    }
    revalidatePath(`/embed/${projectId}`);
  }
  return { success: true };
}

async function listAppwriteModelAssets(projectId: string): Promise<AssetsRow[]> {
  const rows = await listAllRows<AssetsRow>(DB.assets, [
    Query.equal("projectId", projectId),
    Query.or([
      Query.equal("type", AssetType.MODEL_GLB),
      Query.equal("type", AssetType.MODEL_USDZ),
    ]),
    Query.equal("status", AssetStatus.READY),
    Query.equal("provider", "appwrite"),
  ]);
  return rows.filter((a) => a.fileId);
}

async function setFilePublic(asset: AssetsRow, isPublic: boolean): Promise<void> {
  const storage = new Storage(createAdminClient());
  await storage.updateFile({
    bucketId: bucketForAssetType(asset.type),
    fileId: asset.fileId as string,
    permissions: isPublic ? [Permission.read(AppwriteRole.any())] : [],
  });
}

export async function getUserProjects(): Promise<TaskJob[]> {
  const principal = await requirePrincipal();

  const projects = await listAllRows<ProjectsRow>(DB.projects, [
    Query.equal("brandId", principal.userId),
    Query.orderDesc("$createdAt"),
  ]);

  const projectIds = projects.map((p) => p.$id);
  const [assets, revisions, brand] = await Promise.all([
    projectIds.length > 0
      ? listAllRows<AssetsRow>(DB.assets, [Query.equal("projectId", projectIds)])
      : Promise.resolve([] as AssetsRow[]),
    projectIds.length > 0
      ? listAllRows<RevisionRequestRow>(DB.revisionRequests, [Query.equal("projectId", projectIds)])
      : Promise.resolve([] as RevisionRequestRow[]),
    getRowSafe<UsersRow>(DB.users, principal.userId),
  ]);

  const assetsByProject = new Map<string, AssetsRow[]>();
  for (const a of assets) {
    if (!a.projectId) continue;
    const list = assetsByProject.get(a.projectId) ?? [];
    list.push(a);
    assetsByProject.set(a.projectId, list);
  }
  const revisionsByProject = new Map<string, RevisionRequestRow[]>();
  for (const r of revisions) {
    const list = revisionsByProject.get(r.projectId) ?? [];
    list.push(r);
    revisionsByProject.set(r.projectId, list);
  }

  const brandObj = brand
    ? usersToTaskBrand(brand)
    : {
        id: principal.userId,
        name: principal.companyName,
        email: principal.email,
        role: principal.role,
      };

  return projects.map((p) =>
    buildTaskJob({
      project: p,
      assets: assetsByProject.get(p.$id) ?? [],
      brand: brandObj,
      revisionRequests: revisionsByProject.get(p.$id) ?? [],
    }),
  );
}