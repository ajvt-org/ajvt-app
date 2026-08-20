import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { isRateLimited, recordFailedAttempt, getClientIp } from "@/lib/rateLimit";

const VISITOR_COOKIE = "ajvt_vid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // ~400 days — the browser-enforced cap on cookie lifetime
const WINDOW_MS = 15 * 60 * 1000;
const MAX_HITS = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST = withRoute("POST /api/track-visit", async (req: NextRequest) => {
  const key = `track-visit:${getClientIp(req)}`;
  if (isRateLimited(key, MAX_HITS)) {
    return NextResponse.json({ ok: true });
  }
  recordFailedAttempt(key, WINDOW_MS);

  let visitorId = req.cookies.get(VISITOR_COOKIE)?.value;
  if (visitorId && !UUID.test(visitorId)) visitorId = undefined;
  const isNewVisitor = !visitorId;
  if (!visitorId) visitorId = crypto.randomUUID();

  const date = new Date().toISOString().slice(0, 10);

  await prisma.siteVisit.upsert({
    where: { date_visitorId: { date, visitorId } },
    update: { pageViews: { increment: 1 } },
    create: { date, visitorId },
  });

  const res = NextResponse.json({ ok: true });
  if (isNewVisitor) {
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }
  return res;
});
