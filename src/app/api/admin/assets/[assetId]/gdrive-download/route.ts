import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { requirePrincipal } from "@/lib/auth-guards";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    await requirePrincipal({ roles: [Role.ADMIN] });

    const { assetId } = await params;
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { gdriveFileId: true },
    });

    if (!asset?.gdriveFileId) {
      return NextResponse.json({ error: "No GDrive backup available" }, { status: 404 });
    }

    return NextResponse.redirect(
      `https://drive.google.com/file/d/${asset.gdriveFileId}/view`,
      { status: 302 },
    );
  } catch (error) {
    console.error("GDrive download redirect failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}