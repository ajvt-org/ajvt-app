import type { PrismaPromise } from "@prisma/client";
import { prisma } from "./prisma";

export type ProofKind = "photo" | "membership" | "activity" | "donations" | "expense";

export interface OwnedMatch {
  kind: ProofKind;
  ownerId: string | null;
}

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
    rename: (from, to) => prisma.user.updateMany({ where: { photo: from }, data: { photo: to } }),
    serve: {
      via: "authenticated",
      locate: async (base) => {
        const row = await prisma.user.findFirst({
          where: { photo: base },
          select: { id: true },
        });
        return row ? { kind: "photo", ownerId: row.id } : null;
      },
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
    serve: {
      via: "authenticated",
      locate: async (base) => {
        const row = await prisma.membership.findFirst({
          where: { paymentProof: base },
          select: { userId: true },
        });
        return row ? { kind: "membership", ownerId: row.userId } : null;
      },
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
    serve: {
      via: "authenticated",
      locate: async (base) => {
        const row = await prisma.activityRegistration.findFirst({
          where: { paymentProof: base },
          select: { userId: true },
        });
        return row ? { kind: "activity", ownerId: row.userId } : null;
      },
    },
  },
  {
    id: "donation.proof",
    names: async () =>
      (await prisma.donation.findMany({ select: { proof: true } })).map((r) => r.proof),
    rename: (from, to) =>
      prisma.donation.updateMany({ where: { proof: from }, data: { proof: to } }),
    serve: {
      via: "authenticated",
      locate: async (base) => {
        const row = await prisma.donation.findFirst({
          where: { proof: base },
          select: { userId: true },
        });
        return row ? { kind: "donations", ownerId: row.userId } : null;
      },
    },
  },
  {
    id: "payment.proof",
    names: async () =>
      (await prisma.payment.findMany({ select: { proof: true } })).map((r) => r.proof),
    rename: (from, to) =>
      prisma.payment.updateMany({ where: { proof: from }, data: { proof: to } }),
    serve: {
      via: "authenticated",
      locate: async (base) => {
        const row = await prisma.payment.findFirst({
          where: { proof: base },
          select: { purpose: true, userId: true },
        });
        return row ? { kind: paymentKind(row.purpose), ownerId: row.userId } : null;
      },
    },
  },
  {
    id: "expense.proof",
    names: async () =>
      (await prisma.expense.findMany({ select: { proof: true } })).map((r) => r.proof),
    rename: (from, to) =>
      prisma.expense.updateMany({ where: { proof: from }, data: { proof: to } }),
    serve: {
      via: "authenticated",
      locate: async (base) => {
        const row = await prisma.expense.findFirst({
          where: { proof: base },
          select: { id: true },
        });
        return row ? { kind: "expense", ownerId: null } : null;
      },
    },
  },
  {
    id: "activity.photo",
    names: async () =>
      (await prisma.activity.findMany({ select: { photo: true } })).map((r) => r.photo),
    rename: (from, to) =>
      prisma.activity.updateMany({ where: { photo: from }, data: { photo: to } }),
    serve: { via: "public-route", route: "/api/files/activity" },
  },
  {
    id: "team.logo",
    names: async () => (await prisma.team.findMany({ select: { logo: true } })).map((r) => r.logo),
    rename: (from, to) => prisma.team.updateMany({ where: { logo: from }, data: { logo: to } }),
    serve: { via: "public-route", route: "/api/files/team" },
  },
  {
    id: "donation.donorPhoto",
    names: async () =>
      (await prisma.donation.findMany({ select: { donorPhoto: true } })).map((r) => r.donorPhoto),
    rename: (from, to) =>
      prisma.donation.updateMany({ where: { donorPhoto: from }, data: { donorPhoto: to } }),
    serve: { via: "public-route", route: "/api/files/donation" },
  },
  {
    id: "payment.donorPhoto",
    names: async () =>
      (await prisma.payment.findMany({ select: { donorPhoto: true } })).map((r) => r.donorPhoto),
    rename: (from, to) =>
      prisma.payment.updateMany({ where: { donorPhoto: from }, data: { donorPhoto: to } }),
    serve: { via: "public-route", route: "/api/files/donation" },
  },
];

export async function locateUpload(base: string): Promise<OwnedMatch | null> {
  const found = await Promise.all(
    UPLOAD_FIELDS.map((f) => (f.serve.via === "authenticated" ? f.serve.locate(base) : null)),
  );
  return found.find((match) => match !== null) ?? null;
}

export async function renameUpload(from: string, to: string, sha256: string): Promise<void> {
  await prisma.$transaction([
    ...UPLOAD_FIELDS.map((field) => field.rename(from, to)),
    prisma.proofImage.updateMany({ where: { filename: from }, data: { filename: to, sha256 } }),
  ]);
}
