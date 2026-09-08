export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

export const READABLE_UPLOAD_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const CONVERTED_UPLOAD_TYPES = ["image/heic", "image/heif"];

export const ACCEPTED_UPLOAD_TYPES = [...READABLE_UPLOAD_TYPES, ...CONVERTED_UPLOAD_TYPES];

export function serverCanRead(type: string): boolean {
  return READABLE_UPLOAD_TYPES.includes(type.toLowerCase());
}
