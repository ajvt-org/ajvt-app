import { createHash } from "crypto";

export function proofHash(processed: Buffer): string {
  return createHash("sha256").update(processed).digest("hex");
}
