import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { endedDetails, restoredDetails } from "@/lib/membershipEndingAudit";
import { memberPaymentSchema } from "./schema";
import { nameOf } from "@/lib/person";
import { editMemberPayment } from "@/lib/memberPaymentEditServer";

export const PUT = withRoute(
  "PUT /api/admin/members/[id]/payment",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const edit = parse(memberPaymentSchema, await req.json());

    const { person, membership, ending, ends, restores, before, after, amountTransferred } =
      await editMemberPayment(id, edit, session.username);

    const onMember = {
      ...auditContext(session, req),
      targetType: "Member" as const,
      targetId: id,
    };

    await logAction(session.username, "UPDATE_MEMBER_PAYMENT", nameOf(person), {
      ...onMember,
      before,
      after,
    });

    const membershipLabel = `${nameOf(person)} — ${membership.year}`;

    if (ends) {
      await logAction(session.username, "END_MEMBERSHIP", membershipLabel, {
        ...onMember,
        ...endedDetails(membership.year, ending),
      });
    }

    if (restores) {
      await logAction(session.username, "RESTORE_MEMBERSHIP", membershipLabel, {
        ...onMember,
        ...restoredDetails(membership),
      });
    }

    return NextResponse.json({ amountTransferred });
  },
);
