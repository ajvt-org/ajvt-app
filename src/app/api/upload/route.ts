import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getUserSession } from "@/lib/auth";
import { MAX_UPLOAD_SIZE, READABLE_UPLOAD_TYPES } from "@/lib/uploadLimits";
import { logger } from "@/lib/logger";
import { uploadOwnerOf } from "@/lib/uploadOwner";
import { recordProofImage } from "@/lib/uploadOwnerServer";
import { storeUploadImage } from "@/lib/uploadImageStore";
import { declaredBodyTooLarge } from "@/lib/uploadRequestSize";
import { uploads } from "@/lib/messages";
import { withRoute } from "@/lib/route";
import { HttpError, UnauthorizedError, ValidationError } from "@/lib/errors";

export const POST = withRoute("POST /api/upload", async (req: NextRequest) => {
  try {
    const [admin, user] = await Promise.all([getAdminSession(), getUserSession()]);
    if (!admin && !user) throw new UnauthorizedError();

    if (declaredBodyTooLarge(req.headers.get("content-length"))) {
      throw new ValidationError(uploads.tooLarge);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) throw new ValidationError(uploads.noFile);
    if (!READABLE_UPLOAD_TYPES.includes(file.type)) {
      throw new ValidationError(uploads.unsupportedType);
    }
    if (file.size > MAX_UPLOAD_SIZE) throw new ValidationError(uploads.tooLarge);

    const stored = await storeUploadImage(file);
    await recordProofImage(stored.filename, stored.full, uploadOwnerOf(admin, user));

    return NextResponse.json(
      { filename: stored.filename, thumbnailFilename: stored.thumbnailFilename },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof HttpError) throw err;
    logger.error("upload.error", err);
    throw new HttpError("UPLOAD_FAILED", 500, uploads.failed);
  }
});
