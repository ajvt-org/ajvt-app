import { prisma } from "./client";
import { PAYMENT_METHODS } from "./data";
import { placeholder } from "./images";
import { daysAgo, fullName, next, phone, pick } from "./random";
import type { SeededActivity } from "./activities";
import type { SeededMember } from "./members";

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

export async function seedDonations(
  active: SeededMember[],
  health: SeededActivity,
  tags: { id: string }[],
) {
  for (const member of active) {
    await prisma.donation.create({
      data: {
        donorName: member.fullName,
        amount: member.paidAmount,
        status: "ACTIVE",
        source: "MEMBERSHIP",
        paymentMethod: member.paymentMethod,
        userId: member.userId,
        createdAt: member.createdAt,
      },
    });
  }

  for (let i = 0; i < 12; i++) {
    const anonymous = i % 3 === 0;
    await prisma.donation.create({
      data: {
        donorName: anonymous ? null : fullName(40 + i),
        donorPhone: anonymous ? null : phone(40 + i),
        donorPhoto: i % 5 === 0 ? placeholder(`seed-donor-${next()}.webp`) : null,
        amount: [2000, 5000, 10000, 15000, 25000][i % 5],
        proof: placeholder(`seed-donation-${next()}.webp`),
        status: i < 7 ? "ACTIVE" : i < 10 ? "PENDING" : "REJECTED",
        source: "PUBLIC",
        paymentMethod: pick(PAYMENT_METHODS, i),
        activityId: i % 4 === 0 ? health.id : null,
        tags: i % 5 === 0 ? { connect: [{ id: tags[1].id }] } : undefined,
        createdAt: daysAgo(60 - i * 4),
      },
    });
  }

  for (let i = 0; i < 4; i++) {
    await prisma.donation.create({
      data: {
        donorName: null,
        amount: [3000, 7500, 12000, 20000][i],
        proof: placeholder(`seed-donation-${next()}.webp`),
        status: "ACTIVE",
        source: "PUBLIC",
        paymentMethod: pick(PAYMENT_METHODS, i),
        createdAt: daysAgo(50 - i * 3),
      },
    });
  }

  const shy = active.slice(0, 2);
  for (let i = 0; i < shy.length; i++) {
    for (const amount of [4000, 6000]) {
      await prisma.donation.create({
        data: {
          donorName: null,
          amount,
          proof: placeholder(`seed-donation-${next()}.webp`),
          status: "ACTIVE",
          source: "SELF",
          paymentMethod: pick(PAYMENT_METHODS, i),
          userId: shy[i].userId,
          createdAt: daysAgo(30 - i * 2),
        },
      });
    }
  }

  return active.length + 12 + 4 + shy.length * 2;
}

export async function seedExpenses(health: SeededActivity, tags: { id: string }[]) {
  for (let i = 0; i < EXPENSES.length; i++) {
    const [label, amount] = EXPENSES[i];
    await prisma.expense.create({
      data: {
        label,
        amount,
        note: i % 2 === 0 ? "فاتورة متوفرة لدى أمين الصندوق" : null,
        proof: i % 3 === 0 ? placeholder(`seed-expense-${next()}.webp`) : null,
        date: daysAgo(45 - i * 6),
        createdBy: "admin",
        activityId: i % 3 === 1 ? health.id : null,
        tags: { connect: [{ id: pick(tags, i).id }] },
      },
    });
  }
  return EXPENSES.length;
}
