import { requirePrincipalOrRedirect } from "@/lib/auth-guards";
import { generateEmbedCode } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import IntegrationsClient from "./IntegrationsClient";

interface IntegrationProject {
  id: string;
  name: string;
  embedCode: string;
}

export default async function IntegrationsPage() {
  const principal = await requirePrincipalOrRedirect();
  let projects: IntegrationProject[] = [];
  let storefrontPlatform: string | null = null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: principal.userId },
      select: { storefrontPlatform: true },
    });
    storefrontPlatform = user?.storefrontPlatform ?? null;

    projects = await prisma.project.findMany({
      where: { brandId: principal.userId, status: "PUBLISHED" },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }).then((items) => items.map((project) => ({
      ...project,
      embedCode: generateEmbedCode(project.id).iframe,
    })));
  } catch (error) {
    console.error("Failed to fetch integration data:", error);
  }

  return <IntegrationsClient projects={projects} storefrontPlatform={storefrontPlatform} />;
}
