import { randomInt } from "crypto";
import { prisma } from "./prisma";

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
