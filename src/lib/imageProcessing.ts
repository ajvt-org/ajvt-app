import sharp from "sharp";

const MAX_DIMENSION = 1400;
const THUMB_SIZE = 300;
const WEBP_QUALITY = 75;

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export interface ProcessedImage {
  full: Buffer;
  thumbnail: Buffer;
}

export function toBaseFilename(filename: string): string {
  return filename.replace(/-thumb(\.\w+)$/, "$1");
}

export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  const source = sharp(buffer).rotate();

  const [full, thumbnail] = await Promise.all([
    source
      .clone()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),
    source
      .clone()
      .resize({ width: THUMB_SIZE, height: THUMB_SIZE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),
  ]);

  return { full, thumbnail };
}
