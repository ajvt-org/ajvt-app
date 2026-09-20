import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { pushSubscribeSchema } from "./schema";
import { saveSubscription } from "@/lib/pushSubscriptionServer";

export const POST = withRoute("POST /api/push/subscribe", async (req: NextRequest) => {
  const session = await requireUser();
  const { endpoint, keys } = parse(pushSubscribeSchema, await req.json());

  await saveSubscription(session.userId, endpoint, keys);

  return NextResponse.json({ ok: true });
});
