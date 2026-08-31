"use server";

import { revalidatePath } from "next/cache";
import { Query } from "node-appwrite";
import { requirePrincipal, Role } from "@/lib/auth-guards";
import {
  DB,
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
  requesterLiteFromUsers,
} from "@/lib/project-augment";

export async function getAllTasks(): Promise<TaskJob[]> {
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

export async function adminSubmitProject(
  projectId: string,
  glbAssetId: string,
  usdzAssetId?: string,
) {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const glbAsset = await getRowSafe<AssetsRow>(DB.assets, glbAssetId);
  if (!glbAsset || glbAsset.type !== AssetType.MODEL_GLB || glbAsset.status !== AssetStatus.READY) {
    throw new Error("GLB asset not found or not ready");
  }

  let usdzAsset: AssetsRow | null = null;
  if (usdzAssetId) {
    usdzAsset = await getRowSafe<AssetsRow>(DB.assets, usdzAssetId);
    if (!usdzAsset || usdzAsset.type !== AssetType.MODEL_USDZ || usdzAsset.status !== AssetStatus.READY) {
      throw new Error("USDZ asset not found or not ready");
    }
  }

  const project = await getRowSafe<ProjectsRow>(DB.projects, projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  if (
    project.status !== ProjectStatus.PENDING &&
    project.status !== ProjectStatus.REVISIONS
  ) {
    throw new Error("Project is not in a submittable state");
  }

  await runTransaction(async (db, txId) => {
    const current = await getRowSafe<ProjectsRow>(DB.projects, projectId, txId);
    if (
      !current ||
      (current.status !== ProjectStatus.PENDING && current.status !== ProjectStatus.REVISIONS)
    ) {
      throw new Error("Project is no longer available to submit");
    }

    await db.updateRow<ProjectsRow>({
      databaseId: DB.databaseId,
      tableId: DB.projects,
      rowId: projectId,
      data: { status: ProjectStatus.COMPLETED },
      transactionId: txId,
    });

    const linkableIds = [glbAssetId, usdzAssetId].filter(Boolean) as string[];
    const existing = await db.listRows<AssetsRow>({
      databaseId: DB.databaseId,
      tableId: DB.assets,
      queries: [
        Query.equal("projectId", projectId),
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
        data: { projectId },
        transactionId: txId,
      });
    }

    return undefined;
  });

  revalidatePath("/tasks");
  revalidatePath("/admin/tasks");
  return { success: true };
}