import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { extname, join } from "path";
import { getUploadDir } from "./uploadDir";
import { toBaseFilename } from "./imageProcessing";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const PUBLIC_CACHE = "public, max-age=31536000, immutable";
const PRIVATE_CACHE = "private, max-age=31536000, immutable";

function notFound(): NextResponse {
  return new NextResponse("Not found", { status: 404 });
}

export function isSafeUploadName(filename: string): boolean {
  return filename.length > 0 && !filename.includes("..") && !filename.includes("/");
}

export async function serveUpload(
  filename: string,
  allow: (base: string) => Promise<boolean>,
  cacheControl: string,
): Promise<NextResponse> {
  try {
    if (!isSafeUploadName(filename)) return notFound();
    if (!(await allow(toBaseFilename(filename)))) return notFound();

    const buffer = await readFile(join(getUploadDir(), filename));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME[extname(filename).toLowerCase()] || "application/octet-stream",
        "Cache-Control": cacheControl,
      },
    });
  } catch {
    return notFound();
  }
}

export function servePublicUpload(filename: string, allow: (base: string) => Promise<boolean>) {
  return serveUpload(filename, allow, PUBLIC_CACHE);
}

export function servePrivateUpload(filename: string, allow: (base: string) => Promise<boolean>) {
  return serveUpload(filename, allow, PRIVATE_CACHE);
}
