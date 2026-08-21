import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { sendPushToUser } from "@/lib/push";
import { push } from "@/lib/messages";
import { chaseSchema } from "./schema";

export const POST = withRoute("POST /api/admin/waiting/chase", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { userId, kind } = parse(chaseSchema, await req.json());

  await sendPushToUser(
    userId,
    {
      title: push.chaseTitle,
      body: kind === "pending" ? push.chasePending : push.chaseUnfinished,
      url: kind === "pending" ? "/profile" : "/form",
    },
    "MEMBERSHIP_DECISION",
  );

  await logAction(session.username, "CHASE_WAITING_REQUEST", kind, {
    ...auditContext(session, req),
    targetType: "User",
    targetId: userId,
  });

  return NextResponse.json({ ok: true });
});
