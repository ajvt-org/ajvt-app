import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { extname, join } from "path";
import { prisma } from "@/lib/prisma";
import { getUploadDir } from "@/app/api/upload/route";

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

    // Club logos are shown publicly on tournament pages — only serve
    // filenames that are actually a team's logo, so this route can't be
    // used to probe the shared upload directory for other files.
    const team = await prisma.team.findFirst({ where: { logo: filename }, select: { id: true } });
    if (!team) {
      return new NextResponse("Not found", { status: 404 });
    }

    const filePath = join(getUploadDir(), filename);
    const buffer = await readFile(filePath);
    const ext = extname(filename).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
