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

    // Activity photos are marketing content shown on the public landing page,
    // unlike payment proofs/member photos — but only serve filenames that are
    // actually attached to an activity, so this route can't be used to probe
    // the shared upload directory for other members' private files.
    const activity = await prisma.activity.findFirst({ where: { photo: filename }, select: { id: true } });
    if (!activity) {
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
