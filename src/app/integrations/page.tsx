import { createHash } from "crypto";
import { auth } from "@/auth";
import { generateEmbedCode } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import IntegrationsClient from "./IntegrationsClient";

interface IntegrationProject {
  id: string;
  name: string;
  embedCode: string;
}

export default async function IntegrationsPage() {
  let apiKey = "pk_live_placeholder";
  let projects: IntegrationProject[] = [];

  try {
    const session = await auth();
    if (session?.user?.id) {
      apiKey = `pk_live_${createHash("sha256").update(session.user.id).digest("hex").slice(0, 24)}`;

      projects = await prisma.project.findMany({
        where: { brandId: session.user.id, status: "PUBLISHED" },
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
      }).then((items) => items.map((project) => ({
        ...project,
        embedCode: generateEmbedCode(project.id).iframe,
      })));
    }
  } catch (error) {
    console.error("Failed to fetch integration data:", error);
  }

  return <IntegrationsClient apiKey={apiKey} projects={projects} />;
}
