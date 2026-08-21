import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { NOTIFICATION_CATEGORIES } from "@/lib/notificationCategories";
import { notificationPreferenceSchema } from "./schema";

export const GET = withRoute("GET /api/user/notification-preferences", async () => {
  const session = await requireUser();
  const rows = await prisma.notificationPreference.findMany({
    where: { userId: session.userId },
    select: { category: true, enabled: true },
  });
  const off = new Set(rows.filter((r) => !r.enabled).map((r) => r.category));

  return NextResponse.json({
    categories: NOTIFICATION_CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      optOut: c.optOut,
      enabled: c.optOut ? !off.has(c.key) : true,
    })),
  });
});

export const PUT = withRoute("PUT /api/user/notification-preferences", async (req: NextRequest) => {
  const session = await requireUser();
  const { category, enabled } = parse(notificationPreferenceSchema, await req.json());

  await prisma.notificationPreference.upsert({
    where: { userId_category: { userId: session.userId, category } },
    create: { userId: session.userId, category, enabled },
    update: { enabled },
  });

  return NextResponse.json({ ok: true, category, enabled });
});
