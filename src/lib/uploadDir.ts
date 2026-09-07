import { join, resolve, sep } from "path";
import { isLocalDatabase } from "./initialAdminPassword";

export class UploadDirInsidePublicError extends Error {
  constructor(dir: string) {
    super(
      `UPLOAD_DIR resolves to ${dir}, inside public/, which is served as static files with no session. Point it at a directory outside public/.`,
    );
    this.name = "UploadDirInsidePublicError";
  }
}

export interface UploadDirEnv {
  UPLOAD_DIR?: string;
  DATABASE_URL?: string;
  [key: string]: string | undefined;
}

export function uploadDirFrom(env: UploadDirEnv): string {
  const named = env.UPLOAD_DIR?.trim();
  return named ? named : join(process.cwd(), "public", "uploads");
}

export function isServedAsStatic(dir: string): boolean {
  const target = resolve(dir);
  const served = join(process.cwd(), "public");
  return target === served || target.startsWith(served + sep);
}

export function assertUploadDirOutsidePublic(env: UploadDirEnv): void {
  const dir = uploadDirFrom(env);
  if (!isServedAsStatic(dir)) return;
  if (isLocalDatabase(env.DATABASE_URL)) return;
  throw new UploadDirInsidePublicError(dir);
}

export function getUploadDir(): string {
  return uploadDirFrom(process.env);
}
