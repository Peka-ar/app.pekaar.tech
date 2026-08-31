import { ID, Query } from "node-appwrite";
import { requirePrincipal, Role } from "@/server/auth-guards";
import {
  DB,
  getTablesDB,
  getRowSafe,
  listAllRows,
  runTransaction,
  groupBy,
  ProjectStatus,
  AssetStatus,
  AssetType,
  AssetsRow,
  ProjectsRow,
  RevisionRequestRow,
  UsersRow,
} from "@/server/db/client";
import {
  buildTaskJob,
  TaskJob,
  usersToTaskBrand,
  requesterLiteFromUsers,
} from "@/lib/project-augment";
import { canTransition } from "@/server/domain/project-state-machine";
import { setFilePublic } from "@/server/storage";
import { createProjectSchema, adminSubmitSchema, projectIdSchema, sendForRevisionsSchema } from "@/server/http/schemas";
import { AppError, NotFoundError, ConflictError, QuotaExceededError } from "@/server/http/errors";
import { logger } from "@/server/logging";

export interface CreateProjectResult {
  projectId: string;
  remaining: number;
}

export async function createProjectService(
  name: string,
  assetIds: string[],
  sku?: string,
  instructions?: string,
  dimensions?: Record<string, unknown> | null,
): Promise<CreateProjectResult> {
  const parsed = createProjectSchema.safeParse({ name, assetIds, sku, instructions, dimensions });
  if (!parsed.success) {
    throw new AppError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid project data");
  }

  const principal = await requirePrincipal({ roles: [Role.BRAND] });

  const user = await getRowSafe<UsersRow>(DB.users, principal.userId);
  if (!user || !user.usageLimits || user.usageLimits <= 0) {
    throw new QuotaExceededError("Usage limit exceeded. Please upgrade your plan.");
  }

  const { name: cleanName, assetIds: cleanAssetIds, sku: cleanSku, instructions: cleanInstructions, dimensions: cleanDimensions } = parsed.data;

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
      throw new QuotaExceededError("Usage limit exceeded. Please upgrade your plan.");
    }

    let matchedCount = 0;
    if (cleanAssetIds.length > 0) {
      const matched = await db.listRows<AssetsRow>({
        databaseId: DB.databaseId,
        tableId: DB.assets,
        queries: [
          Query.equal("$id", cleanAssetIds),
          Query.equal("ownerId", principal.userId),
          Query.equal("status", AssetStatus.READY),
          // Prevent re-using assets already attached to another project —
          // otherwise this link would silently steal them from that project.
          Query.isNull("projectId"),
        ],
        transactionId: txId,
      });
      matchedCount = matched.total;
    }
    if (matchedCount !== cleanAssetIds.length) {
      throw new ConflictError("One or more assets not found, not ready, or already attached to another project");
    }

    const projectId = ID.unique();
    await db.createRow<ProjectsRow>({
      databaseId: DB.databaseId,
      tableId: DB.projects,
      rowId: projectId,
      data: {
        name: cleanName,
        sku: cleanSku ?? null,
        instructions: cleanInstructions ?? null,
        dimensions: cleanDimensions ? JSON.stringify(cleanDimensions) : null,
        status: ProjectStatus.PENDING,
        sdkConfig: null,
        brandId: principal.userId,
      },
      transactionId: txId,
    });

    if (cleanAssetIds.length > 0) {
      await db.updateRows<AssetsRow>({
        databaseId: DB.databaseId,
        tableId: DB.assets,
        queries: [Query.equal("$id", cleanAssetIds), Query.isNull("projectId")],
        data: { projectId },
        transactionId: txId,
      });
    }

    return { remaining, projectId };
  });

  return { projectId: project.projectId, remaining: project.remaining };
}

export async function brandPublishProjectService(projectId: string): Promise<{ success: true }> {
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) throw new AppError("VALIDATION", "Invalid project id");

  const principal = await requirePrincipal({ roles: [Role.BRAND] });

  const project = await getRowSafe<ProjectsRow>(DB.projects, parsed.data);
  if (!project || project.brandId !== principal.userId) {
    throw new NotFoundError("Project not found or unauthorized");
  }

  if (!canTransition(project.status as ProjectStatus, ProjectStatus.PUBLISHED, Role.BRAND)) {
    throw new ConflictError("Only projects awaiting your review can be published");
  }

  const modelAssets = await listAppwriteModelAssets(parsed.data);
  const hasGlb = modelAssets.some((a) => a.type === AssetType.MODEL_GLB);
  if (!hasGlb) {
    throw new ConflictError("Cannot publish without a 3D model. Please contact support.");
  }

  // Fail-closed: every read:any grant must succeed BEFORE the status flip, so
  // the invariant "PUBLISHED => publicly readable" always holds. On any grant
  // failure, compensate by revoking the ones already granted and abort.
  const granted: AssetsRow[] = [];
  for (const a of modelAssets) {
    try {
      await setFilePublic(a, true);
      granted.push(a);
    } catch (err) {
      logger.error(`[storage] failed to grant read:any on asset=${a.$id}; rolling back`, { err });
      await Promise.allSettled(granted.map((g) => setFilePublic(g, false)));
      throw new AppError("INTERNAL", "Publishing failed. Please try again.");
    }
  }

  const result = await getTablesDB().updateRows<ProjectsRow>({
    databaseId: DB.databaseId,
    tableId: DB.projects,
    queries: [
      Query.equal("$id", parsed.data),
      Query.equal("status", ProjectStatus.COMPLETED),
      Query.equal("brandId", principal.userId),
    ],
    data: { status: ProjectStatus.PUBLISHED },
  });

  if (result.rows.length === 0) {
    await Promise.allSettled(modelAssets.map((a) => setFilePublic(a, false)));
    throw new ConflictError("Project is not in a publishable state");
  }

  return { success: true };
}

export interface SendForRevisionsResult {
  wasPublished: boolean;
}

export async function brandSendForRevisionsService(
  projectId: string,
  note: string,
): Promise<SendForRevisionsResult> {
  const parsed = sendForRevisionsSchema.safeParse({ projectId, note });
  if (!parsed.success) {
    throw new AppError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid revision request");
  }

  const principal = await requirePrincipal({ roles: [Role.BRAND] });

  const project = await getRowSafe<ProjectsRow>(DB.projects, parsed.data.projectId);
  if (!project || project.brandId !== principal.userId) {
    throw new NotFoundError("Project not found or unauthorized");
  }

  if (!canTransition(project.status as ProjectStatus, ProjectStatus.REVISIONS, Role.BRAND)) {
    throw new ConflictError("Revisions can only be requested on completed or published projects");
  }

  const wasPublished = project.status === ProjectStatus.PUBLISHED;

  await runTransaction(async (db, txId) => {
    const current = await getRowSafe<ProjectsRow>(DB.projects, parsed.data.projectId, txId);
    if (!current || current.brandId !== principal.userId) {
      throw new ConflictError("Project is not in a revisable state");
    }
    if (!canTransition(current.status as ProjectStatus, ProjectStatus.REVISIONS, Role.BRAND)) {
      throw new ConflictError("Project is not in a revisable state");
    }

    await db.updateRow<ProjectsRow>({
      databaseId: DB.databaseId,
      tableId: DB.projects,
      rowId: parsed.data.projectId,
      data: { status: ProjectStatus.REVISIONS },
      transactionId: txId,
    });

    await db.createRow<RevisionRequestRow>({
      databaseId: DB.databaseId,
      tableId: DB.revisionRequests,
      rowId: ID.unique(),
      data: {
        projectId: parsed.data.projectId,
        note: parsed.data.note,
        requestedBy: principal.userId,
      },
      transactionId: txId,
    });
  });

  return { wasPublished };
}

export async function getUserProjectsService(): Promise<TaskJob[]> {
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

  const assetsByProject = groupBy(assets, (a) => a.projectId ?? "");
  const revisionsByProject = groupBy(revisions, (r) => r.projectId);

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

export async function getAllTasksService(): Promise<TaskJob[]> {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const projects = await listAllRows<ProjectsRow>(DB.projects, [Query.orderDesc("$createdAt")]);
  const projectIds = projects.map((p) => p.$id);
  const brandIds = [...new Set(projects.map((p) => p.brandId))];

  const [assets, revisions, brands] = await Promise.all([
    projectIds.length > 0
      ? listAllRows<AssetsRow>(DB.assets, [Query.equal("projectId", projectIds)])
      : Promise.resolve([] as AssetsRow[]),
    projectIds.length > 0
      ? listAllRows<RevisionRequestRow>(DB.revisionRequests, [Query.equal("projectId", projectIds)])
      : Promise.resolve([] as RevisionRequestRow[]),
    brandIds.length > 0
      ? listAllRows<UsersRow>(DB.users, [Query.equal("$id", brandIds)])
      : Promise.resolve([] as UsersRow[]),
  ]);

  const assetsByProject = groupBy(assets, (a) => a.projectId ?? "");
  const revisionsByProject = groupBy(revisions, (r) => r.projectId);
  const brandById = new Map(brands.map((b) => [b.$id, b]));
  const requesterMap = new Map(brands.map((b) => [b.$id, requesterLiteFromUsers(b)]));

  return projects.map((p) => {
    const brand = brandById.get(p.brandId);
    return buildTaskJob({
      project: p,
      assets: assetsByProject.get(p.$id) ?? [],
      brand: brand ? usersToTaskBrand(brand) : { id: p.brandId, name: null, email: "", role: Role.BRAND },
      revisionRequests: revisionsByProject.get(p.$id) ?? [],
      requesterMap,
    });
  });
}

export async function adminSubmitProjectService(
  projectId: string,
  glbAssetId: string,
  usdzAssetId?: string,
): Promise<{ success: true }> {
  const parsed = adminSubmitSchema.safeParse({ projectId, glbAssetId, usdzAssetId });
  if (!parsed.success) {
    throw new AppError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid submission data");
  }

  await requirePrincipal({ roles: [Role.ADMIN] });

  const glbAsset = await getRowSafe<AssetsRow>(DB.assets, parsed.data.glbAssetId);
  if (!glbAsset || glbAsset.type !== AssetType.MODEL_GLB || glbAsset.status !== AssetStatus.READY) {
    throw new ConflictError("GLB asset not found or not ready");
  }

  let usdzAsset: AssetsRow | null = null;
  if (parsed.data.usdzAssetId) {
    usdzAsset = await getRowSafe<AssetsRow>(DB.assets, parsed.data.usdzAssetId);
    if (!usdzAsset || usdzAsset.type !== AssetType.MODEL_USDZ || usdzAsset.status !== AssetStatus.READY) {
      throw new ConflictError("USDZ asset not found or not ready");
    }
  }

  const project = await getRowSafe<ProjectsRow>(DB.projects, parsed.data.projectId);
  if (!project) {
    throw new NotFoundError("Project not found");
  }

  if (!canTransition(project.status as ProjectStatus, ProjectStatus.COMPLETED, Role.ADMIN)) {
    throw new ConflictError("Project is not in a submittable state");
  }

  await runTransaction(async (db, txId) => {
    const current = await getRowSafe<ProjectsRow>(DB.projects, parsed.data.projectId, txId);
    if (!current || !canTransition(current.status as ProjectStatus, ProjectStatus.COMPLETED, Role.ADMIN)) {
      throw new ConflictError("Project is no longer available to submit");
    }

    const linkableIds = [parsed.data.glbAssetId, parsed.data.usdzAssetId].filter(Boolean) as string[];

    // In-transaction verification: every model being linked must be READY and
    // unlinked. Staged updateRows responses are unreliable, so we read each
    // row (≤2) instead — this prevents flipping the project to COMPLETED with
    // a model that silently failed to link.
    for (const id of linkableIds) {
      const a = await getRowSafe<AssetsRow>(DB.assets, id, txId);
      if (!a || a.status !== AssetStatus.READY || a.projectId !== null) {
        throw new ConflictError("A model asset is no longer available to link. Please re-check and retry.");
      }
    }

    await db.updateRow<ProjectsRow>({
      databaseId: DB.databaseId,
      tableId: DB.projects,
      rowId: parsed.data.projectId,
      data: { status: ProjectStatus.COMPLETED },
      transactionId: txId,
    });

    const existing = await db.listRows<AssetsRow>({
      databaseId: DB.databaseId,
      tableId: DB.assets,
      queries: [
        Query.equal("projectId", parsed.data.projectId),
        Query.or([
          Query.equal("type", AssetType.MODEL_GLB),
          Query.equal("type", AssetType.MODEL_USDZ),
        ]),
        Query.equal("status", AssetStatus.READY),
        Query.notEqual("$id", linkableIds),
      ],
      transactionId: txId,
    });

    const toArchive = existing.rows.filter((a) => a.fileId);
    if (toArchive.length > 0) {
      await db.updateRows<AssetsRow>({
        databaseId: DB.databaseId,
        tableId: DB.assets,
        queries: [Query.equal("$id", toArchive.map((a) => a.$id))],
        data: { status: AssetStatus.ARCHIVED },
        transactionId: txId,
      });
      // Files are KEPT in Appwrite storage so "Previous models" stays viewable;
      // removal only via explicit cleanup.
    }

    if (linkableIds.length > 0) {
      await db.updateRows<AssetsRow>({
        databaseId: DB.databaseId,
        tableId: DB.assets,
        queries: [Query.equal("$id", linkableIds), Query.isNull("projectId")],
        data: { projectId: parsed.data.projectId },
        transactionId: txId,
      });
    }

    return undefined;
  });

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

export async function listAppwriteModelAssetsForProject(projectId: string): Promise<AssetsRow[]> {
  return listAppwriteModelAssets(projectId);
}
