import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { extname, join } from "path";
import { prisma } from "@/lib/prisma";
import { getUploadDir } from "@/app/api/upload/route";
import { toBaseFilename } from "@/lib/imageProcessing";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    // Safety: block path traversal
    if (filename.includes("..") || filename.includes("/")) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Player headshots are shown publicly on tournament pages (scores,
    // rosters, shareable result images) — unlike payment proofs, only serve
    // filenames that are actually a member's profile photo, so this route
    // can't be used to probe the shared upload directory for other files.
    const member = await prisma.member.findFirst({ where: { photo: toBaseFilename(filename) }, select: { id: true } });
    if (!member) {
      return new NextResponse("Not found", { status: 404 });
    }

    const filePath = join(getUploadDir(), filename);
    const buffer = await readFile(filePath);
    const ext = extname(filename).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
