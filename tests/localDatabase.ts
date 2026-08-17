import { createHash } from "node:crypto";

const LOCAL = "postgresql://ajvt:ajvt@localhost:5433";

export function localDatabase(base: string): string {
  const checkout = createHash("sha1").update(process.cwd()).digest("hex").slice(0, 6);
  return `${LOCAL}/${base}_${checkout}`;
}
