import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { getAdminSession, getUserSession } from "@/lib/auth";
import { processImage, MAX_UPLOAD_SIZE, ALLOWED_UPLOAD_TYPES } from "@/lib/imageProcessing";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { proofHash } from "@/lib/proofHash";
import { getUploadDir } from "@/lib/uploadDir";
import { uploads } from "@/lib/messages";
import { withRoute } from "@/lib/route";
import { HttpError, UnauthorizedError, ValidationError } from "@/lib/errors";

export const POST = withRoute("POST /api/upload", async (req: NextRequest) => {
  try {
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

    try {
      await prisma.proofImage.create({
        data: { filename, sha256: proofHash(processed.full) },
      });
    } catch (err) {
      logger.error("upload.fingerprint.error", err);
    }

    return NextResponse.json({ filename, thumbnailFilename }, { status: 200 });
  } catch (err) {
    if (err instanceof HttpError) throw err;
    logger.error("upload.error", err);
    throw new HttpError("UPLOAD_FAILED", 500, uploads.failed);
  }
});
