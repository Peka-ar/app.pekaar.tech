import "dotenv/config";
import { PrismaClient } from "./generated/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Admin: env-driven via ADMIN_EMAIL / ADMIN_PASSWORD (managed by `npm run sync-admin`).
  // If the env vars are not set, skip the admin entirely — the user can run sync-admin later.
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    const admin = await prisma.user.upsert({
      where: { email: process.env.ADMIN_EMAIL.toLowerCase() },
      update: {
        hashedPassword: adminPassword,
        name: process.env.ADMIN_NAME || "Studio Admin",
        role: "ADMIN",
        status: "ACTIVE",
        onboarded: true,
        emailVerified: new Date(),
        usageLimits: 9999,
      },
      create: {
        email: process.env.ADMIN_EMAIL.toLowerCase(),
        hashedPassword: adminPassword,
        name: process.env.ADMIN_NAME || "Studio Admin",
        role: "ADMIN",
        status: "ACTIVE",
        onboarded: true,
        emailVerified: new Date(),
        usageLimits: 9999,
      },
    });
    console.log(`Admin user synced: ${admin.email}`);
  } else {
    console.log("Skipping admin (ADMIN_EMAIL/ADMIN_PASSWORD not set in .env). Run `npm run sync-admin` to create one.");
  }

  // Demo brand: kept for demo/development. Safe to delete in production.
  const brandPassword = await bcrypt.hash("brand123", 12);
  const brand = await prisma.user.upsert({
    where: { email: "brand@example.com" },
    update: {},
    create: {
      email: "brand@example.com",
      name: "Acme Furniture Co.",
      hashedPassword: brandPassword,
      role: "BRAND",
      usageLimits: 10,
      onboarded: true,
      emailVerified: new Date(),
    },
  });
  console.log("Brand user created:", brand.email);

  // Only seed demo projects if the demo brand has none yet.
  const existingProjects = await prisma.project.count({ where: { brandId: brand.id } });
  if (existingProjects > 0) {
    console.log(`Demo projects already exist (${existingProjects}); skipping demo project seed.`);
    console.log("Seeding complete!");
    return;
  }

  const projectsData = [
    {
      name: "Velvet Sheen Armchair",
      status: "PUBLISHED" as const,
      referenceUrls: [
        "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91",
      ],
      glbUrl: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SheenChair/glTF-Binary/SheenChair.glb",
      sdkConfig: {
        autoRotate: true,
        shadow: 0.8,
        backgroundColor: "#F9F8F6",
        scale: [1, 1, 1],
      },
    },
    {
      name: "Nordic Oak Table",
      status: "COMPLETED" as const,
      referenceUrls: [
        "https://images.unsplash.com/photo-1530018607912-eff2daa1bac4",
      ],
      glbUrl: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SheenChair/glTF-Binary/SheenChair.glb",
    },
    {
      name: "Eames Lounge Replica",
      status: "PENDING" as const,
      referenceUrls: [
        "https://images.unsplash.com/photo-1592078615290-033ee584e267",
      ],
    },
  ];

  for (const projectData of projectsData) {
    const { referenceUrls, glbUrl, ...rest } = projectData;

    const project = await prisma.project.create({
      data: {
        ...rest,
        brandId: brand.id,
      },
    });

    for (const url of referenceUrls) {
      await prisma.asset.create({
        data: {
          type: "REFERENCE_IMAGE",
          status: "READY",
          provider: "external",
          key: url,
          url,
          originalName: "reference.jpg",
          mimeType: "image/jpeg",
          size: 0,
          ownerId: brand.id,
          projectId: project.id,
        },
      });
    }

    if (glbUrl) {
      await prisma.asset.create({
        data: {
          type: "MODEL_GLB",
          status: "PUBLISHED",
          provider: "external",
          key: glbUrl,
          url: glbUrl,
          originalName: "model.glb",
          mimeType: "model/gltf-binary",
          size: 0,
          ownerId: brand.id,
          projectId: project.id,
        },
      });
    }

    console.log(`Project created: ${projectData.name} (${projectData.status})`);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
