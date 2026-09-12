import type { Prisma } from "@prisma/client";
import { prisma } from "./client";
import { PAYMENT_METHODS } from "./data";
import { placeholder } from "./images";
import { daysAgo, fullName, next, phone, pick } from "./random";
import type { SeededActivity } from "./activities";
import type { SeededMember } from "./members";
import { giftPurpose } from "../../src/lib/giftPayment";
import { ensureReceiptsFor } from "../../src/lib/paymentReceiptServer";

const TAG_NAMES = [
  "حملة النظافة",
  "القافلة الصحية",
  "بطولة الناشئين",
  "البطولة الكبرى",
  "مصاريف عامة",
];

const EXPENSES: [string, number][] = [
  ["كرات وتجهيزات رياضية", 18000],
  ["أدوات النظافة للحملة التطوعية", 7500],
  ["طباعة بطاقات العضوية", 4200],
  ["إيجار الملعب", 12000],
  ["ضيافة الأمسية الثقافية", 6300],
  ["جوائز الدوري", 30000],
];

export async function seedTags() {
  const tags = [];
  for (const name of TAG_NAMES) {
    tags.push(await prisma.financeTag.create({ data: { name } }));
  }
  return tags;
}

async function gave(data: Prisma.PaymentUncheckedCreateInput) {
  const payment = await prisma.payment.create({ data });
  await ensureReceiptsFor(prisma, { id: payment.id });
  return payment;
}

export async function seedDonations(
  active: SeededMember[],
  health: SeededActivity,
  tags: { id: string }[],
) {
  for (let i = 0; i < 12; i++) {
    const unnamed = i % 3 === 0;
    const activityId = i % 4 === 0 ? health.id : null;
    const madeOn = daysAgo(60 - i * 4);
    await gave({
      purpose: giftPurpose({ activityId }),
      donorName: unnamed ? null : fullName(40 + i),
      donorPhone: unnamed ? null : phone(40 + i),
      donorPhoto: i % 5 === 0 ? placeholder(`seed-donor-${next()}.webp`) : null,
      amount: [2000, 5000, 10000, 15000, 25000][i % 5],
      proof: placeholder(`seed-donation-${next()}.webp`),
      status: i < 7 ? "ACTIVE" : i < 10 ? "PENDING" : "REJECTED",
      source: "PUBLIC",
      method: pick(PAYMENT_METHODS, i),
      activityId,
      tags: i % 5 === 0 ? { connect: [{ id: tags[1].id }] } : undefined,
      paidOn: madeOn,
      createdAt: madeOn,
    });
  }

  for (let i = 0; i < 4; i++) {
    const madeOn = daysAgo(50 - i * 3);
    await gave({
      purpose: "DONATION",
      donorName: null,
      amount: [3000, 7500, 12000, 20000][i],
      proof: placeholder(`seed-donation-${next()}.webp`),
      status: "ACTIVE",
      source: "PUBLIC",
      method: pick(PAYMENT_METHODS, i),
      paidOn: madeOn,
      createdAt: madeOn,
    });
  }

  const shy = active.slice(0, 2);
  for (let i = 0; i < shy.length; i++) {
    for (const amount of [4000, 6000]) {
      const madeOn = daysAgo(30 - i * 2);
      await gave({
        purpose: "DONATION",
        donorName: null,
        amount,
        proof: placeholder(`seed-donation-${next()}.webp`),
        status: "ACTIVE",
        source: "SELF",
        method: pick(PAYMENT_METHODS, i),
        userId: shy[i].userId,
        paidOn: madeOn,
        createdAt: madeOn,
      });
    }
  }

  return 12 + 4 + shy.length * 2;
}

export async function seedExpenses(health: SeededActivity, tags: { id: string }[]) {
  for (let i = 0; i < EXPENSES.length; i++) {
    const [label, amount] = EXPENSES[i];
    const activityId = i % 3 === 1 ? health.id : null;
    const proof = i % 3 === 0 ? placeholder(`seed-expense-${next()}.webp`) : null;
    await prisma.expense.create({
      data: {
        label,
        amount,
        note: i % 2 === 0 ? "فاتورة متوفرة لدى أمين الصندوق" : null,
        proof,
        proofs: proof ? { create: [{ filename: proof }] } : undefined,
        date: daysAgo(45 - i * 6),
        createdBy: "admin",
        activityId,
        tags: { connect: [{ id: pick(tags, i).id }] },
        allocations: { create: [{ amount, activityId }] },
      },
    });
  }
  return EXPENSES.length;
}
