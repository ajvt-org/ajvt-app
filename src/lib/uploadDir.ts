import { join } from "path";

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
}
