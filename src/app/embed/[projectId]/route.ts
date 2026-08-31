import { readFile } from "node:fs/promises";
import path from "node:path";
import { Query } from "node-appwrite";
import { AssetType, DB, ProjectStatus, ProjectsRow, getRowSafe, listAllRows, AssetsRow } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const project = await getRowSafe<ProjectsRow>(DB.projects, projectId);
  if (!project || project.status !== ProjectStatus.PUBLISHED) {
    return new Response("Not found", { status: 404 });
  }

  const assets = await listAllRows<AssetsRow>(DB.assets, [Query.equal("projectId", projectId)]);
  const hasGlb = assets.some((asset) => asset.type === AssetType.MODEL_GLB);
  if (!hasGlb) {
    return new Response("Not found", { status: 404 });
  }

  const templatePath = path.join(process.cwd(), "public", "embed-viewer.html");
  const html = await readFile(templatePath, "utf-8");
  const body = html.replace(/\{PROJECT_ID\}/g, projectId);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}