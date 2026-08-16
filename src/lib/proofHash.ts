import { createHash } from "crypto";

// A payment is proved by a screenshot, because the payment provider offers no
// way to ask it whether a transaction happened. Nothing stopped the same
// screenshot being sent twice, for two different memberships.
//
// The hash is taken on the processed WebP rather than on what was uploaded:
// /api/upload re-encodes every image before writing it, so the bytes on disk
// are the only ones that still exist, and they are the only ones the proofs
// already stored can be re-hashed from. The cost is that a future sharp
// upgrade would change the encoding, leaving files from before and after
// comparable only within their own era.
export function proofHash(processed: Buffer): string {
  return createHash("sha256").update(processed).digest("hex");
}
