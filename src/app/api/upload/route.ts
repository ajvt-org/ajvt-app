import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { getAdminSession, getUserSession } from "@/lib/auth";
import { processImage, MAX_UPLOAD_SIZE, ALLOWED_UPLOAD_TYPES } from "@/lib/imageProcessing";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { proofHash } from "@/lib/proofHash";
import { uploads } from "@/lib/messages";
import { withRoute } from "@/lib/route";
import { HttpError, UnauthorizedError, ValidationError } from "@/lib/errors";

export function getUploadDir(): string {
  // In production (Render): UPLOAD_DIR points to a mounted persistent Disk
  // In development: public/uploads (served statically)
  return process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
}

export const POST = withRoute("POST /api/upload", async (req: NextRequest) => {
  try {
    // Open (unauthenticated) uploads would let anyone flood disk space with
    // arbitrary files — every legitimate caller (member form, admin panel)
    // is already signed in.
    const [admin, user] = await Promise.all([getAdminSession(), getUserSession()]);
    if (!admin && !user) throw new UnauthorizedError();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) throw new ValidationError(uploads.noFile);
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type))
      throw new ValidationError(uploads.unsupportedType);
    if (file.size > MAX_UPLOAD_SIZE) throw new ValidationError(uploads.tooLarge);

    const id = uuidv4();
    const filename = `${id}.webp`;
    const thumbnailFilename = `${id}-thumb.webp`;
    const uploadDir = getUploadDir();
    let processed;
    try {
      processed = await processImage(Buffer.from(await file.arrayBuffer()));
    } catch (err) {
      logger.error("image.processing.error", err);
      throw new ValidationError(uploads.processingFailed);
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
    // withRoute would answer a failure here with the generic server message.
    // The upload dialog shows whatever comes back, so it keeps its own
    // sentence, thrown rather than returned so the shape matches the rest.
    if (err instanceof HttpError) throw err;
    logger.error("upload.error", err);
    throw new HttpError("UPLOAD_FAILED", 500, uploads.failed);
  }
});
