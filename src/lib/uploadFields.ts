import type { PrismaPromise } from "@prisma/client";
import { prisma } from "./prisma";
import { mostRestrictive, type OwnedMatch, type ProofKind } from "./uploadMatch";
import { CONFIDENTIAL_SELECT, PUBLIC_VIEWER, seesPaymentIdentity } from "./supportPrivacy";

export type { OwnedMatch, ProofKind };

export const PUBLIC_FILE_ROUTES = [
  "/api/files/activity",
  "/api/files/donation",
  "/api/files/member",
  "/api/files/team",
] as const;

export type PublicFileRoute = (typeof PUBLIC_FILE_ROUTES)[number];

export type Serving =
  | { via: "authenticated"; locate: (base: string) => Promise<OwnedMatch | null> }
  | { via: "public-route"; route: PublicFileRoute };

export interface UploadField {
  id: string;
  names(): Promise<(string | null)[]>;
  holds(filename: string): PrismaPromise<number>;
  rename(from: string, to: string): PrismaPromise<unknown>;
  serve: Serving;
}

function paymentKind(purpose: string): ProofKind {
  if (purpose === "MEMBERSHIP") return "membership";
  if (purpose === "ACTIVITY") return "activity";
  return "donations";
}

export const UPLOAD_FIELDS: UploadField[] = [
  {
    id: "user.photo",
    names: async () =>
      (await prisma.user.findMany({ select: { photo: true } })).map((r) => r.photo),
    holds: (filename) => prisma.user.count({ where: { photo: filename } }),
    rename: (from, to) => prisma.user.updateMany({ where: { photo: from }, data: { photo: to } }),
    serve: {
      via: "authenticated",
      locate: async (base) => {
        const row = await prisma.user.findFirst({
          where: { photo: base },
          select: { id: true },
        });
        return row ? { kind: "photo", ownerId: row.id, confidential: false } : null;
      },
    },
  },
  {
    id: "activityRegistration.paymentProof",
    names: async () =>
      (await prisma.activityRegistration.findMany({ select: { paymentProof: true } })).map(
        (r) => r.paymentProof,
      ),
    holds: (filename) => prisma.activityRegistration.count({ where: { paymentProof: filename } }),
    rename: (from, to) =>
      prisma.activityRegistration.updateMany({
        where: { paymentProof: from },
        data: { paymentProof: to },
      }),
    serve: {
      via: "authenticated",
      locate: async (base) => {
        const row = await prisma.activityRegistration.findFirst({
          where: { paymentProof: base },
          select: { userId: true },
        });
        return row ? { kind: "activity", ownerId: row.userId, confidential: false } : null;
      },
    },
  },
  {
    id: "payment.proof",
    names: async () =>
      (await prisma.payment.findMany({ select: { proof: true } })).map((r) => r.proof),
    holds: (filename) => prisma.payment.count({ where: { proof: filename } }),
    rename: (from, to) =>
      prisma.payment.updateMany({ where: { proof: from }, data: { proof: to } }),
    serve: {
      via: "authenticated",
      locate: async (base) => {
        const row = await prisma.payment.findFirst({
          where: { proof: base },
          select: {
            purpose: true,
            amount: true,
            feeApplied: true,
            userId: true,
            user: { select: CONFIDENTIAL_SELECT },
          },
        });
        if (!row) return null;
        return {
          kind: paymentKind(row.purpose),
          ownerId: row.userId,
          confidential: !seesPaymentIdentity(PUBLIC_VIEWER, row),
        };
      },
    },
  },
  {
    id: "expenseProof.filename",
    names: async () =>
      (await prisma.expenseProof.findMany({ select: { filename: true } })).map((r) => r.filename),
    holds: (filename) => prisma.expenseProof.count({ where: { filename } }),
    rename: (from, to) =>
      prisma.expenseProof.updateMany({ where: { filename: from }, data: { filename: to } }),
    serve: {
      via: "authenticated",
      locate: async (base) => {
        const row = await prisma.expenseProof.findFirst({
          where: { filename: base },
          select: { id: true },
        });
        return row ? { kind: "expense", ownerId: null, confidential: false } : null;
      },
    },
  },
  {
    id: "activity.photo",
    names: async () =>
      (await prisma.activity.findMany({ select: { photo: true } })).map((r) => r.photo),
    holds: (filename) => prisma.activity.count({ where: { photo: filename } }),
    rename: (from, to) =>
      prisma.activity.updateMany({ where: { photo: from }, data: { photo: to } }),
    serve: { via: "public-route", route: "/api/files/activity" },
  },
  {
    id: "team.logo",
    names: async () => (await prisma.team.findMany({ select: { logo: true } })).map((r) => r.logo),
    holds: (filename) => prisma.team.count({ where: { logo: filename } }),
    rename: (from, to) => prisma.team.updateMany({ where: { logo: from }, data: { logo: to } }),
    serve: { via: "public-route", route: "/api/files/team" },
  },
  {
    id: "payment.donorPhoto",
    names: async () =>
      (await prisma.payment.findMany({ select: { donorPhoto: true } })).map((r) => r.donorPhoto),
    holds: (filename) => prisma.payment.count({ where: { donorPhoto: filename } }),
    rename: (from, to) =>
      prisma.payment.updateMany({ where: { donorPhoto: from }, data: { donorPhoto: to } }),
    serve: { via: "public-route", route: "/api/files/donation" },
  },
];

export async function countUploadReferrers(filename: string): Promise<number> {
  const counts = await prisma.$transaction(UPLOAD_FIELDS.map((field) => field.holds(filename)));
  return counts.reduce((total, one) => total + one, 0);
}

export async function locateUpload(base: string): Promise<OwnedMatch | null> {
  const found = await Promise.all(
    UPLOAD_FIELDS.map((f) => (f.serve.via === "authenticated" ? f.serve.locate(base) : null)),
  );
  return mostRestrictive(found);
}

export async function renameUpload(from: string, to: string, sha256: string): Promise<void> {
  await prisma.$transaction([
    ...UPLOAD_FIELDS.map((field) => field.rename(from, to)),
    prisma.proofImage.updateMany({ where: { filename: from }, data: { filename: to, sha256 } }),
  ]);
}
