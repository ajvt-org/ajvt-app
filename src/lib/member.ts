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
