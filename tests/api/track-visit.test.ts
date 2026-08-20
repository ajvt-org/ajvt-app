import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/track-visit/route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "./helpers";

function visit(ip: string, visitorId?: string): NextRequest {
  return new NextRequest("http://localhost/api/track-visit", {
    method: "POST",
    headers: {
      origin: "http://localhost",
      "x-forwarded-for": ip,
      ...(visitorId ? { cookie: `ajvt_vid=${visitorId}` } : {}),
    },
  });
}

describe("POST /api/track-visit", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("counts a repeat visit on the same cookie as page views, not new rows", async () => {
    const id = "3f2c1a9e-0b1d-4c2e-9f3a-1234567890ab";

    await POST(visit("203.0.113.1", id));
    await POST(visit("203.0.113.1", id));

    const rows = await prisma.siteVisit.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].pageViews).toBe(2);
  });

  it("stops minting rows for one IP past the threshold, still answering 200", async () => {
    for (let i = 0; i < 60; i++) {
      expect((await POST(visit("203.0.113.2"))).status).toBe(200);
    }
    const before = await prisma.siteVisit.count();

    const res = await POST(visit("203.0.113.2"));

    expect(res.status).toBe(200);
    expect(await prisma.siteVisit.count()).toBe(before);
  });

  it("treats a malformed cookie as a new visitor instead of passing it to the database", async () => {
    const res = await POST(visit("203.0.113.3", "not-a-uuid'; DROP TABLE"));

    expect(res.status).toBe(200);
    const rows = await prisma.siteVisit.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].visitorId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(res.cookies.get("ajvt_vid")?.value).toBe(rows[0].visitorId);
  });
});
