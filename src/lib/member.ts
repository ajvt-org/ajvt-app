import { randomInt } from "crypto";
import { prisma } from "./prisma";
import { generateVerifyToken } from "./verifyToken";

export async function issueMembership(): Promise<{
  memberNumber: string;
  verifyToken: string;
}> {
  return { memberNumber: await generateMemberNumber(), verifyToken: generateVerifyToken() };
}

export async function generateMemberNumber(): Promise<string> {
  const year = new Date().getFullYear();

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
