import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VISITOR_COOKIE = "ajvt_vid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // ~400 days — the browser-enforced cap on cookie lifetime

export async function POST(req: NextRequest) {
  try {
    let visitorId = req.cookies.get(VISITOR_COOKIE)?.value;
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
  } catch (err) {
    console.error("Track visit error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
