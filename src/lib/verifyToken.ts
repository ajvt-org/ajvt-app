import { randomBytes } from "crypto";

// What the membership card's QR points at. The member number it used to carry
// runs AJVT-2026-0001, 0002, 0003, so anyone holding one card could count
// through the rest and read every member's name, photo and age off the public
// verification page. This is 128 bits of randomness instead.
//
// It lives apart from lib/member so it can be tested without a database:
// that module opens a Prisma client the moment it is imported.
export function generateVerifyToken(): string {
  return randomBytes(16).toString("hex");
}
