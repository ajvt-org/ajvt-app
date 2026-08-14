import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";

export const POST = withRoute("POST /api/push/unsubscribe", async (req: NextRequest) => {
  await requireUser();
  const { endpoint } = await req.json();

  if (!endpoint) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint } });

  return NextResponse.json({ ok: true });
});
