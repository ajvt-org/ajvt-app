import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { nameOf } from "@/lib/person";
import { adminMembershipCreateSchema } from "./schema";
import { addMembershipToPerson } from "@/lib/membershipAddServer";

export const POST = withRoute(
  "POST /api/admin/people/[id]/membership",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const input = parse(adminMembershipCreateSchema, await req.json());

    const { person, paidAmount, membershipYear } = await addMembershipToPerson(id, input, session);

    await logAction(session.username, "ADD_MEMBERSHIP", nameOf(person), {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: person.id,
      after: {
        paymentMethod: input.paymentMethod,
        paidAmount,
        status: input.status,
        year: membershipYear,
      },
    });

    return NextResponse.json({ member: { id: person.id } }, { status: 201 });
  },
);
