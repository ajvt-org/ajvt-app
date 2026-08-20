import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { getUploadDir } from "@/app/api/upload/route";
import { getUserSession, requireAdmin } from "@/lib/auth";
import { isScopedRole } from "@/lib/activityAccess";
import { proofScope } from "@/lib/proofScope";
import { toBaseFilename } from "@/lib/imageProcessing";
import { prisma } from "@/lib/prisma";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

type Kind = "photo" | "membership" | "activity" | "donations" | "expense";

interface Match {
  kind: Kind;
  ownerId: string | null;
}

function paymentKind(purpose: string): Kind {
  if (purpose === "MEMBERSHIP") return "membership";
  if (purpose === "ACTIVITY") return "activity";
  return "donations";
}

async function findMatch(base: string): Promise<Match | null> {
  const [photo, member, membership, registration, donation, payment, expense] = await Promise.all([
    prisma.member.findFirst({ where: { photo: base }, select: { userId: true } }),
    prisma.member.findFirst({ where: { paymentProof: base }, select: { userId: true } }),
    prisma.membership.findFirst({
      where: { paymentProof: base },
      select: { member: { select: { userId: true } } },
    }),
    prisma.activityRegistration.findFirst({
      where: { paymentProof: base },
      select: { member: { select: { userId: true } } },
    }),
    prisma.donation.findFirst({
      where: { proof: base },
      select: { member: { select: { userId: true } } },
    }),
    prisma.payment.findFirst({
      where: { proof: base },
      select: { purpose: true, member: { select: { userId: true } } },
    }),
    prisma.expense.findFirst({ where: { proof: base }, select: { id: true } }),
  ]);

  if (photo) return { kind: "photo", ownerId: photo.userId };
  if (member) return { kind: "membership", ownerId: member.userId };
  if (membership) return { kind: "membership", ownerId: membership.member.userId };
  if (registration) return { kind: "activity", ownerId: registration.member.userId };
  if (donation) return { kind: "donations", ownerId: donation.member?.userId ?? null };
  if (payment)
    return { kind: paymentKind(payment.purpose), ownerId: payment.member?.userId ?? null };
  if (expense) return { kind: "expense", ownerId: null };
  return null;
}

function adminAllowed(role: string, kind: Kind): boolean {
  if (kind === "photo") return true;
  if (kind === "expense") return !isScopedRole(role);
  return proofScope(role)[kind];
}

async function adminSession(): Promise<{ role: string } | null> {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    // Payment proof screenshots can contain banking details — only signed-in
    // admins or members may view them, not anyone who guesses/finds the URL.
    const [admin, user] = await Promise.all([adminSession(), getUserSession()]);
    if (!admin && !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { filename } = await params;
    // Safety: block path traversal
    if (filename.includes("..") || filename.includes("/")) {
      return new NextResponse("Not found", { status: 404 });
    }

    const match = await findMatch(toBaseFilename(filename));
    const userId = user ? (user as { userId?: string }).userId : undefined;
    const allowed =
      !!match &&
      ((admin && adminAllowed(admin.role, match.kind)) ||
        (match.kind === "photo" && !!userId) ||
        (!!userId && match.ownerId === userId));
    if (!allowed) {
      return new NextResponse("Not found", { status: 404 });
    }

    const filePath = join(getUploadDir(), filename);
    const buffer = await readFile(filePath);
    const ext = extname(filename).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    // private (not public): this route is auth-gated, so a shared/proxy
    // cache must never store a response meant for one admin/member's
    // session. Filenames are uuid-based and never rewritten in place
    // (recompression always assigns a new name), so immutable is safe.
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
