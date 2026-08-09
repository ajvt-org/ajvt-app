import { prisma } from "./prisma";

export async function generateMemberNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.member.count();
  const seq = String(count + 1).padStart(4, "0");
  return `AJVT-${year}-${seq}`;
}
