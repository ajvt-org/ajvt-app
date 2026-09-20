import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { pushUnsubscribeSchema } from "./schema";
import { dropSubscription } from "@/lib/pushSubscriptionServer";

export const POST = withRoute("POST /api/push/unsubscribe", async (req: NextRequest) => {
  const session = await requireUser();
  const { endpoint } = parse(pushUnsubscribeSchema, await req.json());

  await dropSubscription(session.userId, endpoint);

  return NextResponse.json({ ok: true });
});
