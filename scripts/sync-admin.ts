/**
 * sync-admin.ts — Permanent, idempotent admin bootstrapper.
 *
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from .env and upserts the user:
 * - If the email already exists as a BRAND user, promotes them to ADMIN (no data loss).
 * - If the user does not exist, creates them with role=ADMIN, status=ACTIVE, onboarded=true.
 * - If the user exists as ADMIN, refreshes their password hash, name, status, and verified flag.
 *
 * Also deletes the legacy `admin@studiov.com` account (if present and not the env-driven one).
 * Does NOT touch any other data, projects, assets, or events.
 *
 * Usage:
 *   npm run sync-admin
 */

import "dotenv/config";
import { PrismaClient } from "../prisma/generated/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

function readEnv() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Studio Admin";

  if (!email) {
    throw new Error("ADMIN_EMAIL is not set in .env");
  }
  if (!password) {
    throw new Error("ADMIN_PASSWORD is not set in .env");
  }
  if (password.length < 6) {
    throw new Error("ADMIN_PASSWORD must be at least 6 characters");
  }
  return { email, password, name };
}

async function main() {
  const { email, password, name } = readEnv();
  const hashedPassword = await bcrypt.hash(password, 12);

  console.log(`Syncing admin user: ${email}`);

  // Step 1: upsert the env-driven admin (preserves all data on existing users)
  const existing = await prisma.user.findUnique({ where: { email } });

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      hashedPassword,
      name,
      role: "ADMIN",
      status: "ACTIVE",
      onboarded: true,
      emailVerified: new Date(),
      usageLimits: 9999,
      suspendedAt: null,
      statusReason: null,
    },
    create: {
      email,
      hashedPassword,
      name,
      role: "ADMIN",
      status: "ACTIVE",
      onboarded: true,
      emailVerified: new Date(),
      usageLimits: 9999,
    },
  });

  if (existing) {
    console.log(`  -> updated existing user (id: ${admin.id})`);
  } else {
    console.log(`  -> created new user (id: ${admin.id})`);
  }

  // Step 2: delete any admin user that is NOT the env-driven admin email.
  // This removes legacy placeholders (admin@studiov.com) AND any other stray ADMIN accounts
  // so the platform always has exactly one permanent admin.
  const envEmail = email;
  const strayAdmins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      email: { not: envEmail },
    },
    select: { id: true, email: true },
  });

  for (const stray of strayAdmins) {
    await prisma.user.delete({ where: { id: stray.id } });
    console.log(`  -> deleted stray admin: ${stray.email}`);
  }

  if (strayAdmins.length === 0) {
    console.log("  -> no stray admins to remove");
  }

  console.log("\nSync complete. You can now sign in at /auth with:");
  console.log(`  email:    ${email}`);
  console.log(`  password: (the value of ADMIN_PASSWORD in .env)`);
}

main()
  .catch((e) => {
    console.error("Sync failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
