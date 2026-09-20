import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { getUploadDir } from "./uploadDir";
import { processImage } from "./imageProcessing";
import { thumbnailOf } from "./uploadNames";
import { ValidationError } from "./errors";
import { logger } from "./logger";
import { uploads } from "./messages";

export interface StoredUpload {
  id: string;
  filename: string;
  thumbnailFilename: string;
  full: Buffer;
}

export async function storeUploadImage(file: File): Promise<StoredUpload> {
  let processed;
  try {
    processed = await processImage(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    logger.error("image.processing.error", err);
    throw new ValidationError(uploads.processingFailed);
  }

  const id = uuidv4();
  const filename = `${id}.webp`;
  const thumbnailFilename = thumbnailOf(filename);
  const uploadDir = getUploadDir();

  await mkdir(uploadDir, { recursive: true });
  await Promise.all([
    writeFile(join(/* turbopackIgnore: true */ uploadDir, filename), processed.full),
    writeFile(join(/* turbopackIgnore: true */ uploadDir, thumbnailFilename), processed.thumbnail),
  ]);

  return { id, filename, thumbnailFilename, full: processed.full };
}
