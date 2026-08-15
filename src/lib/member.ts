import { randomBytes, randomInt } from "crypto";
import { prisma } from "./prisma";

// What the membership card's QR points at. The member number it used to carry
// runs AJVT-2026-0001, 0002, 0003, so anyone holding one card could count
// through the rest and read every member's name, photo and age off the public
// verification page. This is 128 bits of randomness instead.
export function generateVerifyToken(): string {
  return randomBytes(16).toString("hex");
}

// Both are handed out at the same moment, when a request is approved, so they
// are handed out together. A member with a number and no token has a card whose
// QR points nowhere.
export async function issueMembership(): Promise<{
  memberNumber: string;
  verifyToken: string;
}> {
  return { memberNumber: await generateMemberNumber(), verifyToken: generateVerifyToken() };
}

export async function generateMemberNumber(): Promise<string> {
  const year = new Date().getFullYear();
  // Atomic UPDATE on a single row — safe under concurrent approvals, unlike
  // a count()-then-write which can race and hand out duplicate numbers.
  const counter = await prisma.counter.upsert({
    where: { id: "memberNumber" },
    update: { value: { increment: 1 } },
    create: { id: "memberNumber", value: 1 },
  });
  const seq = String(counter.value).padStart(4, "0");
  return `AJVT-${year}-${seq}`;
}

// randomInt, not Math.random: this is a password, and Math.random's output is
// predictable from earlier values, which matters most for a code an attacker
// knows was just issued.
export function generateTempPassword(): string {
  return String(randomInt(100000, 1000000));
}
