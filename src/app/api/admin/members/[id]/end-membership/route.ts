import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { currentMembership } from "@/lib/currentMembershipServer";
import { endingRefusal, isEndingReason, restoreRefusal } from "@/lib/membershipEnding";
import { endingRefusalMessage, restoreRefusalMessage } from "@/lib/membershipEndingMessages";
import { endMembership, restoreMembership } from "@/lib/membershipEndingServer";
import { nameOf, PERSON_SELECT } from "@/lib/person";
import { endMembershipSchema } from "./schema";

async function personAndMembership(id: string) {
  const person = await prisma.user.findUnique({ where: { id }, select: PERSON_SELECT });
  if (!person) throw new NotFoundError(messages.notFound);

  const membership = await currentMembership(prisma, id);
  if (!membership) throw new NotFoundError(messages.notFound);

  return { person, membership };
}

export const POST = withRoute(
  "POST /api/admin/members/[id]/end-membership",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { reason } = parse(endMembershipSchema, await req.json());
    if (!isEndingReason(reason)) throw new ValidationError(messages.endingReasonInvalid);

    const { person, membership } = await personAndMembership(id);
    const refusal = endingRefusal(membership);
    if (refusal) throw new ConflictError(endingRefusalMessage(refusal));

    const at = new Date();
    await endMembership(prisma, id, membership.year, { reason, by: session.username, at });

    await logAction(session.username, "END_MEMBERSHIP", `${nameOf(person)} — ${membership.year}`, {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before: { year: membership.year, endedAt: null, endedReason: null, endedBy: null },
      after: {
        year: membership.year,
        endedAt: at.toISOString(),
        endedReason: reason,
        endedBy: session.username,
      },
    });

    return NextResponse.json({
      membership: { year: membership.year, endedAt: at.toISOString(), endedReason: reason },
    });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/members/[id]/end-membership",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const { person, membership } = await personAndMembership(id);
    const refusal = restoreRefusal(membership);
    if (refusal) throw new ConflictError(restoreRefusalMessage(refusal));

    await restoreMembership(prisma, id, membership.year);

    await logAction(
      session.username,
      "RESTORE_MEMBERSHIP",
      `${nameOf(person)} — ${membership.year}`,
      {
        ...auditContext(session, req),
        targetType: "Member",
        targetId: id,
        before: {
          year: membership.year,
          endedAt: membership.endedAt?.toISOString() ?? null,
          endedReason: membership.endedReason,
          endedBy: membership.endedBy,
        },
        after: { year: membership.year, endedAt: null, endedReason: null, endedBy: null },
      },
    );

    return NextResponse.json({ membership: { year: membership.year, endedAt: null } });
  },
);
