import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { notificationPreferenceSchema } from "./schema";
import { notificationChoices, setNotificationChoice } from "@/lib/notificationPreferencesServer";

export const GET = withRoute("GET /api/user/notification-preferences", async () => {
  const session = await requireUser();

  return NextResponse.json({ categories: await notificationChoices(session.userId) });
});

export const PUT = withRoute("PUT /api/user/notification-preferences", async (req: NextRequest) => {
  const session = await requireUser();
  const { category, enabled } = parse(notificationPreferenceSchema, await req.json());

  await setNotificationChoice(session.userId, category, enabled);

  return NextResponse.json({ ok: true, category, enabled });
});
