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

const proofsResponse = z.object({ proofs: z.array(proofSchema) });
const membersResponse = z.object({ members: z.array(memberRowSchema) });
const activitiesResponse = z.object({ activities: z.array(activitySchema) });
const tagsResponse = z.object({ tags: z.array(financeTagSchema) });

function read<T>(event: string, schema: z.ZodType<T>, body: unknown, fallback: T): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  logger.error(event, result.error.issues[0]);
  return fallback;
}

export function readProofs(body: unknown) {
  return read("payments.proofs.shape", proofsResponse, body, { proofs: [] }).proofs;
}

export function readActivities(body: unknown) {
  return read("payments.activities.shape", activitiesResponse, body, { activities: [] }).activities;
}

export function readFinanceTags(body: unknown) {
  return read("payments.tags.shape", tagsResponse, body, { tags: [] }).tags;
}

export function readMembers(body: unknown): MemberOption[] {
  return read("payments.members.shape", membersResponse, body, { members: [] }).members.map(
    (m) => ({
      id: m.id,
      userId: m.userId,
      fullName: m.fullName,
      memberNumber: m.memberNumber,
      phone: m.user?.phone ?? null,
      village: m.village,
      age: m.age,
      photo: m.photo,
    }),
  );
}
