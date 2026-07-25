import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, status: ProjectStatus.PUBLISHED },
    select: { id: true, assets: { select: { type: true, url: true } } },
  });

  if (!project) {
    return new Response("Not found", { status: 404 });
  }

  const hasGlb = project.assets.some((asset) => asset.type === "MODEL_GLB");
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
