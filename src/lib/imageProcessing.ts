import sharp from "sharp";

// Uploaded photos/proofs can arrive as multi-megabyte camera originals, and
// every later view (leaderboard, landing page, admin lists) re-downloads the
// stored file — there's no CDN in front of Render, so this is what drives
// the account's monthly bandwidth. Re-encoding once at upload time keeps
// every later view cheap without changing the upload UI or API contract.
const MAX_DIMENSION = 1400; // longest side, px — plenty to verify a payment proof or show a profile photo
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

// A thumbnail ("<id>-thumb.webp") is never itself stored in the DB — only
// the full filename ("<id>.webp") is. The /api/files/* routes check
// ownership by looking up that stored filename, so a request for the
// thumbnail variant needs to be checked against this base form instead.
export function toBaseFilename(filename: string): string {
  return filename.replace(/-thumb(\.\w+)$/, "$1");
}

// sharp strips all metadata (EXIF included) by default unless .withMetadata()
// is called — .rotate() must run first to bake in the orientation before
// that metadata is gone, otherwise portrait photos come out sideways.
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
