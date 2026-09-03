import { z } from "zod";
import { logger } from "@/lib/logger";
import type { MemberOption } from "./paymentTypes";

const nullableText = z.string().nullable();

export const proofSchema = z.object({
  id: z.string(),
  kind: z.enum(["MEMBERSHIP", "ACTIVITY", "DONATION"]),
  proof: nullableText,
  memberName: z.string(),
  activityTitle: nullableText,
  amount: z.number().nullable(),
  status: z.string(),
  source: z.string().optional(),
  paymentMethod: nullableText.optional(),
  memberId: nullableText.optional(),
  userId: nullableText.optional(),
  anonymous: z.boolean().optional(),
  activityId: nullableText.optional(),
  competitionId: nullableText.optional(),
  competitionName: nullableText.optional(),
  donorName: nullableText.optional(),
  donorPhone: nullableText.optional(),
  donorPhoto: nullableText.optional(),
  tags: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  receipt: z
    .object({ number: z.string(), status: z.string(), token: z.string() })
    .nullable()
    .optional(),
  uploadedAt: z.string(),
  submittedAt: z.string(),
});

export const memberRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  memberNumber: nullableText,
  village: z.string(),
  age: nullableText,
  photo: nullableText,
  user: z.object({ phone: nullableText }).nullable(),
});

export const activitySchema = z.object({ id: z.string(), title: z.string() });

export const financeTagSchema = z.object({ id: z.string(), name: z.string() });

function readRows<T>(event: string, item: z.ZodType<T>, body: unknown, key: string): T[] {
  const rows = (body as Record<string, unknown> | null | undefined)?.[key];
  if (!Array.isArray(rows)) {
    logger.error(event, { reason: "not a list" });
    return [];
  }

  const kept: T[] = [];
  for (const row of rows) {
    const result = item.safeParse(row);
    if (result.success) kept.push(result.data);
    else logger.error(event, result.error.issues[0]);
  }
  return kept;
}

export function readProofs(body: unknown) {
  return readRows("payments.proofs.shape", proofSchema, body, "proofs");
}

export function readActivities(body: unknown) {
  return readRows("payments.activities.shape", activitySchema, body, "activities");
}

export function readFinanceTags(body: unknown) {
  return readRows("payments.tags.shape", financeTagSchema, body, "tags");
}

export function readMembers(body: unknown): MemberOption[] {
  return readRows("payments.members.shape", memberRowSchema, body, "members").map((m) => ({
    id: m.id,
    userId: m.userId,
    fullName: m.fullName,
    memberNumber: m.memberNumber,
    phone: m.user?.phone ?? null,
    village: m.village,
    age: m.age,
    photo: m.photo,
  }));
}
