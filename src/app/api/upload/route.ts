import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { getAdminSession, getUserSession } from "@/lib/auth";
import { processImage, MAX_UPLOAD_SIZE, ALLOWED_UPLOAD_TYPES } from "@/lib/imageProcessing";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { proofHash } from "@/lib/proofHash";
import { common, uploads } from "@/lib/messages";

export function getUploadDir(): string {
  // In production (Render): UPLOAD_DIR points to a mounted persistent Disk
  // In development: public/uploads (served statically)
  return process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
}

export async function POST(req: NextRequest) {
  try {
    // Open (unauthenticated) uploads would let anyone flood disk space with
    // arbitrary files — every legitimate caller (member form, admin panel)
    // is already signed in.
    const [admin, user] = await Promise.all([getAdminSession(), getUserSession()]);
    if (!admin && !user) {
      return NextResponse.json({ error: common.unauthorized }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type))
      return NextResponse.json({ error: uploads.unsupportedType }, { status: 400 });
    if (file.size > MAX_UPLOAD_SIZE)
      return NextResponse.json({ error: uploads.tooLarge }, { status: 400 });

    const id = uuidv4();
    const filename = `${id}.webp`;
    const thumbnailFilename = `${id}-thumb.webp`;
    const uploadDir = getUploadDir();
    let processed;
    try {
      processed = await processImage(Buffer.from(await file.arrayBuffer()));
    } catch (err) {
      logger.error("image.processing.error", err);
      return NextResponse.json({ error: uploads.processingFailed }, { status: 400 });
    }

    await mkdir(uploadDir, { recursive: true });
    await Promise.all([
      writeFile(join(/* turbopackIgnore: true */ uploadDir, filename), processed.full),
      writeFile(
        join(/* turbopackIgnore: true */ uploadDir, thumbnailFilename),
        processed.thumbnail,
      ),
    ]);

    // Recorded for every upload, not only payment proofs: which of them turns
    // out to be a proof is decided later, by whichever record stores the name.
    // A failure here must not lose an upload the caller already has.
    try {
      await prisma.proofImage.create({
        data: { filename, sha256: proofHash(processed.full) },
      });
    } catch (err) {
      logger.error("upload.fingerprint.error", err);
    }

    return NextResponse.json({ filename, thumbnailFilename }, { status: 200 });
  } catch (err) {
    logger.error("upload.error", err);
    return NextResponse.json({ error: uploads.failed }, { status: 500 });
  }
}
