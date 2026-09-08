import { MAX_UPLOAD_SIZE } from "./uploadLimits";

const MULTIPART_ENVELOPE = 8 * 1024;

export const MAX_UPLOAD_REQUEST_SIZE = MAX_UPLOAD_SIZE + MULTIPART_ENVELOPE;

export function declaredBodyTooLarge(contentLength: string | null): boolean {
  if (contentLength === null || contentLength.trim() === "") return false;
  const bytes = Number(contentLength);
  return Number.isFinite(bytes) && bytes > MAX_UPLOAD_REQUEST_SIZE;
}
