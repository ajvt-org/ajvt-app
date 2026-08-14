import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { getUploadDir } from "@/app/api/upload/route";
import { getAdminSession, getUserSession } from "@/lib/auth";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    // Payment proof screenshots can contain banking details — only signed-in
    // admins or members may view them, not anyone who guesses/finds the URL.
    const [admin, user] = await Promise.all([getAdminSession(), getUserSession()]);
    if (!admin && !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { filename } = await params;
    // Safety: block path traversal
    if (filename.includes("..") || filename.includes("/")) {
      return new NextResponse("Not found", { status: 404 });
    }
    const filePath = join(getUploadDir(), filename);
    const buffer = await readFile(filePath);
    const ext = extname(filename).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    // private (not public): this route is auth-gated, so a shared/proxy
    // cache must never store a response meant for one admin/member's
    // session. Filenames are uuid-based and never rewritten in place
    // (recompression always assigns a new name), so immutable is safe.
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
