import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { extname, join } from "path";
import { getUploadDir } from "./uploadDir";
import { toBaseFilename } from "./imageProcessing";
import { logger } from "./logger";

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
  if (!isSafeUploadName(filename)) {
    logger.warn("upload.refused.name", { filename });
    return notFound();
  }

  let permitted: boolean;
  try {
    permitted = await allow(toBaseFilename(filename));
  } catch (err) {
    logger.error("upload.refused.lookup", err);
    return notFound();
  }
  if (!permitted) {
    logger.info("upload.refused.permission", { filename });
    return notFound();
  }

  const dir = getUploadDir();
  try {
    const buffer = await readFile(join(dir, filename));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME[extname(filename).toLowerCase()] || "application/octet-stream",
        "Cache-Control": cacheControl,
      },
    });
  } catch (err) {
    logger.error("upload.refused.read", { dir, filename, err: (err as Error)?.message });
    return notFound();
  }
}

export function servePublicUpload(filename: string, allow: (base: string) => Promise<boolean>) {
  return serveUpload(filename, allow, PUBLIC_CACHE);
}

export function servePrivateUpload(filename: string, allow: (base: string) => Promise<boolean>) {
  return serveUpload(filename, allow, PRIVATE_CACHE);
}
