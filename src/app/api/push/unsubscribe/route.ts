import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { pushUnsubscribeSchema } from "./schema";

export const POST = withRoute("POST /api/push/unsubscribe", async (req: NextRequest) => {
  await requireUser();
  const { endpoint } = parse(pushUnsubscribeSchema, await req.json());

  await prisma.pushSubscription.deleteMany({ where: { endpoint } });

  return NextResponse.json({ ok: true });
});
