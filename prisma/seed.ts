import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@studiov.com" },
    update: {},
    create: {
      email: "admin@studiov.com",
      name: "Studio Admin",
      hashedPassword: adminPassword,
      role: "ADMIN",
      usageLimits: 9999,
    },
  });
  console.log("Admin user created:", admin.email);

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
    },
  });
  console.log("Brand user created:", brand.email);

  const projects = [
    {
      name: "Velvet Sheen Armchair",
      status: "PUBLISHED" as const,
      referenceUrls: [
        "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91",
      ],
      assetUrls: {
        glb: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SheenChair/glTF-Binary/SheenChair.glb",
        usdz: "",
      },
      sdkConfig: {
        autoRotate: true,
        shadow: 0.8,
        backgroundColor: "#F9F8F6",
        scale: [1, 1, 1],
      },
    },
    {
      name: "Nordic Oak Table",
      status: "REVIEW" as const,
      referenceUrls: [
        "https://images.unsplash.com/photo-1530018607912-eff2daa1bac4",
      ],
      assetUrls: {
        glb: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SheenChair/glTF-Binary/SheenChair.glb",
        usdz: "",
      },
      sdkConfig: null,
    },
    {
      name: "Eames Lounge Replica",
      status: "PENDING" as const,
      referenceUrls: [
        "https://images.unsplash.com/photo-1592078615290-033ee584e267",
      ],
      assetUrls: null,
      sdkConfig: null,
    },
  ];

  for (const project of projects) {
    await prisma.project.create({
      data: {
        ...project,
        brandId: brand.id,
      },
    });
    console.log(`Project created: ${project.name} (${project.status})`);
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
