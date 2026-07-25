import { prisma } from "../src/lib/prisma";

const p = await prisma.project.findFirst({
  where: { status: "PUBLISHED" },
  select: { id: true },
});

if (p) {
  console.log(p.id);
} else {
  console.log("NONE");
}

process.exit(0);
