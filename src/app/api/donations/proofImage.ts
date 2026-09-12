import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { getUploadDir } from "@/lib/uploadDir";
import { processImage } from "@/lib/imageProcessing";
import { thumbnailOf } from "@/lib/uploadNames";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { uploads } from "@/lib/messages";

export interface StoredProof {
  id: string;
  filename: string;
}

export async function storeProofImage(file: File): Promise<StoredProof> {
  let processed;
  try {
    processed = await processImage(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    logger.error("image.processing.error", err);
    throw new ValidationError(uploads.processingFailed);
  }

  const id = uuidv4();
  const filename = `${id}.webp`;
  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });
  await Promise.all([
    writeFile(join(/* turbopackIgnore: true */ uploadDir, filename), processed.full),
    writeFile(
      join(/* turbopackIgnore: true */ uploadDir, thumbnailOf(filename)),
      processed.thumbnail,
    ),
  ]);

  return { id, filename };
}
