import { uploads } from "@/lib/messages";
import { serverCanRead } from "@/lib/uploadLimits";

const COMPRESS_THRESHOLD = 2 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const QUALITY = 0.75;
const SENT_AS = "image/jpeg";

async function reencode(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, SENT_AS, QUALITY));
}

export async function prepareImageForUpload(file: File): Promise<File | Blob> {
  const mustConvert = !serverCanRead(file.type);
  if (!mustConvert && file.size <= COMPRESS_THRESHOLD) return file;

  let encoded: Blob | null = null;
  try {
    encoded = await reencode(file);
  } catch {
    encoded = null;
  }

  if (!encoded) {
    if (mustConvert) throw new Error(uploads.cannotConvert);
    return file;
  }
  if (!mustConvert && encoded.size >= file.size) return file;
  return encoded;
}
