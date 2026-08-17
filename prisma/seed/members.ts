import { prisma } from "./client";
import { generateVerifyToken } from "../../src/lib/verifyToken";
import { AGE_GROUPS, PAYMENT_METHODS, REJECTION_REASONS } from "./data";
import { placeholder } from "./images";
import { daysAgo, fullName, next, pick, referenceCode } from "./random";

export type SeededUser = { id: string; phone: string };
export type SeededMember = Awaited<ReturnType<typeof prisma.member.create>>;

export interface SeededMembers {
  all: SeededMember[];
  active: SeededMember[];
  pending: SeededMember[];
  memberNumber: number;
}

function statusFor(i: number, count: number): "ACTIVE" | "PENDING" | "REJECTED" {
  if (i < Math.round(count * 0.65)) return "ACTIVE";
  if (i < Math.round(count * 0.88)) return "PENDING";
  return "REJECTED";
}

export async function seedMembers(users: SeededUser[], count: number): Promise<SeededMembers> {
  const all: SeededMember[] = [];
  const active: SeededMember[] = [];
  const pending: SeededMember[] = [];
  let memberNumber = 0;

  for (let i = 0; i < count; i++) {
    const status = statusFor(i, count);
    const isActive = status === "ACTIVE";
    if (isActive) memberNumber += 1;

    const member = await prisma.member.create({
      data: {
        userId: i % 9 === 8 ? null : users[i].id,
        fullName: fullName(i),
        age: pick(AGE_GROUPS, i),
        paymentMethod: pick(PAYMENT_METHODS, i),
        paymentProof: i % 7 === 6 ? null : placeholder(`seed-proof-${next()}.webp`),
        photo: i % 3 === 0 ? placeholder(`seed-photo-${next()}.webp`) : null,
        paidAmount: [500, 1000, 1500, 2000, 3000][i % 5],
        referenceCode: referenceCode(i),
        status,
        rejectionReason: status === "REJECTED" ? pick(REJECTION_REASONS, i) : null,
        memberNumber: isActive ? `AJVT-2026-${String(memberNumber).padStart(4, "0")}` : null,
        verifyToken: isActive ? generateVerifyToken() : null,
        createdAt: daysAgo(100 - i * 2),
      },
    });

    all.push(member);
    if (isActive) active.push(member);
    if (status === "PENDING") pending.push(member);
  }

  await prisma.counter.upsert({
    where: { id: "memberNumber" },
    update: { value: memberNumber },
    create: { id: "memberNumber", value: memberNumber },
  });

  return { all, active, pending, memberNumber };
}
