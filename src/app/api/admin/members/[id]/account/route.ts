import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { accountPhoneSchema } from "./schema";
import { nameOf } from "@/lib/person";
import { changeAccountPhone } from "@/lib/memberAccountServer";

export const PATCH = withRoute(
  "PATCH /api/admin/members/[id]/account",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { phone } = parse(accountPhoneSchema, await req.json());

    const { person, before, phone: next, changed } = await changeAccountPhone(id, phone);

    if (changed) {
      await logAction(session.username, "CHANGE_ACCOUNT_PHONE", `${nameOf(person)} — ${next}`, {
        ...auditContext(session, req),
        targetType: "Member",
        targetId: id,
        before: { phone: before },
        after: { phone: next },
      });
    }

    return NextResponse.json({ phone: next });
  },
);
