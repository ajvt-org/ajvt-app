import type { PrismaPromise } from "@prisma/client";
import { prisma } from "./prisma";

export type ProofKind = "photo" | "membership" | "activity" | "donations" | "expense";

export interface OwnedMatch {
  kind: ProofKind;
  ownerId: string | null;
}

export interface UploadField {
  id: string;
  names(): Promise<(string | null)[]>;
  rename(from: string, to: string): PrismaPromise<unknown>;
  locate: ((base: string) => Promise<OwnedMatch | null>) | null;
}

function paymentKind(purpose: string): ProofKind {
  if (purpose === "MEMBERSHIP") return "membership";
  if (purpose === "ACTIVITY") return "activity";
  return "donations";
}

export const UPLOAD_FIELDS: UploadField[] = [
  {
    id: "member.photo",
    names: async () =>
      (await prisma.member.findMany({ select: { photo: true } })).map((r) => r.photo),
    rename: (from, to) => prisma.member.updateMany({ where: { photo: from }, data: { photo: to } }),
    locate: async (base) => {
      const row = await prisma.member.findFirst({
        where: { photo: base },
        select: { userId: true },
      });
      return row ? { kind: "photo", ownerId: row.userId } : null;
    },
  },
  {
    id: "member.paymentProof",
    names: async () =>
      (await prisma.member.findMany({ select: { paymentProof: true } })).map((r) => r.paymentProof),
    rename: (from, to) =>
      prisma.member.updateMany({ where: { paymentProof: from }, data: { paymentProof: to } }),
    locate: async (base) => {
      const row = await prisma.member.findFirst({
        where: { paymentProof: base },
        select: { userId: true },
      });
      return row ? { kind: "membership", ownerId: row.userId } : null;
    },
  },
  {
    id: "membership.paymentProof",
    names: async () =>
      (await prisma.membership.findMany({ select: { paymentProof: true } })).map(
        (r) => r.paymentProof,
      ),
    rename: (from, to) =>
      prisma.membership.updateMany({ where: { paymentProof: from }, data: { paymentProof: to } }),
    locate: async (base) => {
      const row = await prisma.membership.findFirst({
        where: { paymentProof: base },
        select: { member: { select: { userId: true } } },
      });
      return row ? { kind: "membership", ownerId: row.member.userId } : null;
    },
  },
  {
    id: "activityRegistration.paymentProof",
    names: async () =>
      (await prisma.activityRegistration.findMany({ select: { paymentProof: true } })).map(
        (r) => r.paymentProof,
      ),
    rename: (from, to) =>
      prisma.activityRegistration.updateMany({
        where: { paymentProof: from },
        data: { paymentProof: to },
      }),
    locate: async (base) => {
      const row = await prisma.activityRegistration.findFirst({
        where: { paymentProof: base },
        select: { member: { select: { userId: true } } },
      });
      return row ? { kind: "activity", ownerId: row.member.userId } : null;
    },
  },
  {
    id: "donation.proof",
    names: async () =>
      (await prisma.donation.findMany({ select: { proof: true } })).map((r) => r.proof),
    rename: (from, to) =>
      prisma.donation.updateMany({ where: { proof: from }, data: { proof: to } }),
    locate: async (base) => {
      const row = await prisma.donation.findFirst({
        where: { proof: base },
        select: { member: { select: { userId: true } } },
      });
      return row ? { kind: "donations", ownerId: row.member?.userId ?? null } : null;
    },
  },
  {
    id: "payment.proof",
    names: async () =>
      (await prisma.payment.findMany({ select: { proof: true } })).map((r) => r.proof),
    rename: (from, to) =>
      prisma.payment.updateMany({ where: { proof: from }, data: { proof: to } }),
    locate: async (base) => {
      const row = await prisma.payment.findFirst({
        where: { proof: base },
        select: { purpose: true, member: { select: { userId: true } } },
      });
      return row ? { kind: paymentKind(row.purpose), ownerId: row.member?.userId ?? null } : null;
    },
  },
  {
    id: "expense.proof",
    names: async () =>
      (await prisma.expense.findMany({ select: { proof: true } })).map((r) => r.proof),
    rename: (from, to) =>
      prisma.expense.updateMany({ where: { proof: from }, data: { proof: to } }),
    locate: async (base) => {
      const row = await prisma.expense.findFirst({ where: { proof: base }, select: { id: true } });
      return row ? { kind: "expense", ownerId: null } : null;
    },
  },
  {
    id: "activity.photo",
    names: async () =>
      (await prisma.activity.findMany({ select: { photo: true } })).map((r) => r.photo),
    rename: (from, to) =>
      prisma.activity.updateMany({ where: { photo: from }, data: { photo: to } }),
    locate: null,
  },
  {
    id: "team.logo",
    names: async () => (await prisma.team.findMany({ select: { logo: true } })).map((r) => r.logo),
    rename: (from, to) => prisma.team.updateMany({ where: { logo: from }, data: { logo: to } }),
    locate: null,
  },
  {
    id: "donation.donorPhoto",
    names: async () =>
      (await prisma.donation.findMany({ select: { donorPhoto: true } })).map((r) => r.donorPhoto),
    rename: (from, to) =>
      prisma.donation.updateMany({ where: { donorPhoto: from }, data: { donorPhoto: to } }),
    locate: null,
  },
  {
    id: "payment.donorPhoto",
    names: async () =>
      (await prisma.payment.findMany({ select: { donorPhoto: true } })).map((r) => r.donorPhoto),
    rename: (from, to) =>
      prisma.payment.updateMany({ where: { donorPhoto: from }, data: { donorPhoto: to } }),
    locate: null,
  },
];

export async function locateUpload(base: string): Promise<OwnedMatch | null> {
  const found = await Promise.all(UPLOAD_FIELDS.map((f) => (f.locate ? f.locate(base) : null)));
  return found.find((match) => match !== null) ?? null;
}

export async function renameUpload(from: string, to: string, sha256: string): Promise<void> {
  await prisma.$transaction([
    ...UPLOAD_FIELDS.map((field) => field.rename(from, to)),
    prisma.proofImage.updateMany({ where: { filename: from }, data: { filename: to, sha256 } }),
  ]);
}
