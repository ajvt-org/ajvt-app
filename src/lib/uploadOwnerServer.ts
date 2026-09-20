import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { uploads } from "./messages";
import { isAnonymousOwner, ownsUpload, type UploadOwner } from "./uploadOwner";
import { logger } from "./logger";
import { proofHash } from "./proofHash";

export const ANONYMOUS_UPLOADER: UploadOwner = { userId: null, adminId: null };

export async function requireOwnUpload(
  filename: string | null | undefined,
  owner: UploadOwner,
): Promise<void> {
  if (!filename) return;
  if (isAnonymousOwner(owner)) throw new ValidationError(uploads.notYourUpload);

  const record = await prisma.proofImage.findUnique({
    where: { filename },
    select: { uploadedByUserId: true, uploadedByAdminId: true },
  });

  if (!ownsUpload(record, owner)) throw new ValidationError(uploads.notYourUpload);
}

export async function recordProofImage(
  filename: string,
  bytes: Buffer,
  owner: UploadOwner,
): Promise<void> {
  try {
    await prisma.proofImage.create({
      data: {
        filename,
        sha256: proofHash(bytes),
        uploadedByUserId: owner.userId,
        uploadedByAdminId: owner.adminId,
      },
    });
  } catch (err) {
    logger.error("upload.fingerprint.error", err);
  }
}
