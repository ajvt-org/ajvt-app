import { prisma } from "./client";
import { generateVerifyToken } from "../../src/lib/verifyToken";
import { PAYMENT_METHOD_SHARE, REJECTION_REASONS } from "./data";
import { placeholder } from "./images";
import { daysAgo, fullName, next, pick, referenceCode } from "./random";
import { runningYear } from "../../src/lib/membershipYear";
import { mirrorMembershipPayment } from "../../src/lib/paymentMirror";
import { MEMBERSHIP_FEE } from "../../src/lib/donations";
import { rosterSlots } from "./roster";
import { syncPersonFromMember } from "../../src/lib/personServer";

export type SeededUser = { id: string; phone: string | null };
export type SeededMember = Awaited<ReturnType<typeof prisma.member.create>>;

export interface SeededMembers {
  all: SeededMember[];
  active: SeededMember[];
  pending: SeededMember[];
  memberNumber: number;
}

const NO_ACCOUNT_EVERY = 33;
const NO_PROOF_EVERY = 4;
const PHOTO_EVERY = 2;

function paymentMethod(i: number): string {
  const total = PAYMENT_METHOD_SHARE.reduce((sum, [, share]) => sum + share, 0);
  let at = i % total;
  for (const [method, share] of PAYMENT_METHOD_SHARE) {
    if (at < share) return method;
    at -= share;
  }
  return PAYMENT_METHOD_SHARE[0][0];
}

function yearFor(i: number, count: number, current: number): number {
  return i < Math.round(count * 0.2) ? current - 1 : current;
}

export async function seedMembers(users: SeededUser[]): Promise<SeededMembers> {
  const slots = rosterSlots();
  const all: SeededMember[] = [];
  const active: SeededMember[] = [];
  const pending: SeededMember[] = [];
  let memberNumber = 0;
  const current = runningYear();

  for (let i = 0; i < slots.length; i++) {
    const { age, village, status } = slots[i];
    const isActive = status === "ACTIVE";
    const membershipYear = yearFor(i, slots.length, current);
    if (isActive) memberNumber += 1;

    const addedByHand = i % NO_ACCOUNT_EVERY === NO_ACCOUNT_EVERY - 1;
    const owner = addedByHand
      ? (await prisma.user.create({ data: { fullName: fullName(i) } })).id
      : users[i].id;

    const member = await prisma.member.create({
      data: {
        userId: owner,
        fullName: fullName(i),
        age,
        village,
        paymentMethod: paymentMethod(i),
        paymentProof:
          i % NO_PROOF_EVERY === NO_PROOF_EVERY - 1
            ? null
            : placeholder(`seed-proof-${next()}.webp`),
        photo: i % PHOTO_EVERY === 0 ? placeholder(`seed-photo-${next()}.webp`) : null,
        paidAmount: [500, 1000, 1500, 2000, 3000][i % 5],
        referenceCode: referenceCode(i),
        status,
        rejectionReason: status === "REJECTED" ? pick(REJECTION_REASONS, i) : null,
        membershipYear,
        memberNumber: isActive
          ? `AJVT-${membershipYear}-${String(memberNumber).padStart(4, "0")}`
          : null,
        verifyToken: isActive ? generateVerifyToken() : null,
        createdAt: daysAgo(Math.max(1, 130 - i)),
      },
    });

    await syncPersonFromMember(prisma, member.id);

    await mirrorMembershipPayment(prisma, {
      memberId: member.id,
      year: membershipYear,
      amount: member.paidAmount,
      feeApplied: MEMBERSHIP_FEE,
      method: member.paymentMethod,
      proof: member.paymentProof,
      status,
      anonymous: member.surplusAnonymous,
      donorName: member.fullName,
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
