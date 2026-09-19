import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { offeredMethodNames } from "@/lib/paymentMethodsServer";
import { renewSchema } from "./schema";
import { nameOf } from "@/lib/person";
import { renewMembership } from "@/lib/memberRenewServer";

export const POST = withRoute(
  "POST /api/admin/members/[id]/renew",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const renewal = parse(renewSchema(await offeredMethodNames()), await req.json());

    const { person, member, before, after } = await renewMembership(id, renewal, session);

    await logAction(
      session.username,
      "RENEW_MEMBER",
      `${nameOf(person)} — ${after.membershipYear}`,
      { ...auditContext(session, req), targetType: "Member", targetId: id, before, after },
    );

    return NextResponse.json({ member }, { status: 201 });
  },
);
