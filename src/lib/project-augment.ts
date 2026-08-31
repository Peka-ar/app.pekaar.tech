import {
  AssetsRow,
  ProjectsRow,
  RevisionRequestRow,
  UsersRow,
  AssetStatus,
  AssetType,
  ProjectStatus,
} from "@/server/db/client";

export type TaskAsset = {
  id: string;
  type: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskBrand = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  productCategory?: string | null;
  storefrontPlatform?: string | null;
  catalogSize?: string | null;
};

export type RevisionRequestLite = {
  id: string;
  note: string;
  createdAt: string;
  requester?: { id: string; name: string | null; email: string } | null;
};

export type TaskJob = {
  id: string;
  name: string;
  sku: string | null;
  instructions: string | null;
  dimensions: unknown;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  brandId: string;
  sdkConfig: string | null;
  assets: TaskAsset[];
  brand: TaskBrand;
  referenceUrls: string[];
  assetUrls: { glb: string; usdz?: string } | null;
  archivedAssetUrls: { glb: TaskAsset[]; usdz: TaskAsset[] };
  revisionRequests?: RevisionRequestLite[];
};

export type RequesterLite = { id: string; name: string | null; email: string };

const proxyUrl = (id: string) => `/api/v1/assets/${id}/file`;

function toTaskAsset(a: AssetsRow): TaskAsset {
  return {
    id: a.$id,
    type: a.type,
    url: a.url,
    originalName: a.originalName,
    mimeType: a.mimeType,
    size: a.size,
    status: a.status,
    createdAt: a.$createdAt,
    updatedAt: a.$updatedAt,
  };
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function buildTaskJob(input: {
  project: ProjectsRow;
  assets: AssetsRow[];
  brand: TaskBrand;
  revisionRequests?: RevisionRequestRow[];
  requesterMap?: Map<string, RequesterLite>;
}): TaskJob {
  const { project, assets, brand, revisionRequests, requesterMap } = input;

  const liveGlb = assets.find((a) => a.type === AssetType.MODEL_GLB && a.status === AssetStatus.READY);
  const liveUsdz = assets.find((a) => a.type === AssetType.MODEL_USDZ && a.status === AssetStatus.READY);
  const archivedGlbs = assets
    .filter((a) => a.type === AssetType.MODEL_GLB && a.status === AssetStatus.ARCHIVED)
    .sort((a, b) => new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime());
  const archivedUsdzs = assets
    .filter((a) => a.type === AssetType.MODEL_USDZ && a.status === AssetStatus.ARCHIVED)
    .sort((a, b) => new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime());

  const mappedRevisions = (revisionRequests ?? [])
    .slice()
    .sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
    .map((r) => ({
      id: r.$id,
      note: r.note,
      createdAt: r.$createdAt,
      requester: requesterMap?.get(r.requestedBy) ?? null,
    }));

  return {
    id: project.$id,
    name: project.name,
    sku: project.sku,
    instructions: project.instructions,
    dimensions: parseJson<unknown>(project.dimensions),
    status: project.status as ProjectStatus,
    createdAt: project.$createdAt,
    updatedAt: project.$updatedAt,
    brandId: project.brandId,
    sdkConfig: project.sdkConfig,
    assets: assets.map(toTaskAsset),
    brand,
    referenceUrls: assets.filter((a) => a.type === AssetType.REFERENCE_IMAGE).map((a) => proxyUrl(a.$id)),
    assetUrls: liveGlb
      ? {
          glb: proxyUrl(liveGlb.$id),
          usdz: liveUsdz ? proxyUrl(liveUsdz.$id) : undefined,
        }
      : null,
    archivedAssetUrls: {
      glb: archivedGlbs.map((a) => ({ ...toTaskAsset(a), url: proxyUrl(a.$id) })),
      usdz: archivedUsdzs.map((a) => ({ ...toTaskAsset(a), url: proxyUrl(a.$id) })),
    },
    revisionRequests: mappedRevisions.length > 0 ? mappedRevisions : undefined,
  };
}

export function usersToTaskBrand(u: UsersRow): TaskBrand {
  return {
    id: u.$id,
    name: u.name,
    email: u.email,
    role: u.role,
    productCategory: u.productCategory,
    storefrontPlatform: u.storefrontPlatform,
    catalogSize: u.catalogSize,
  };
}

export function requesterLiteFromUsers(u: UsersRow): RequesterLite {
  return { id: u.$id, name: u.name, email: u.email };
}