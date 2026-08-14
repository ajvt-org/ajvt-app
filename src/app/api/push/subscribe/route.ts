import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { pushSubscribeSchema } from "./schema";

export const POST = withRoute("POST /api/push/subscribe", async (req: NextRequest) => {
  const session = await requireUser();
  const { endpoint, keys } = parse(pushSubscribeSchema, await req.json());

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: session.userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: session.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
});
