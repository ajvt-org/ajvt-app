import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";

// A probe for the platform, which restarts on failure and until now had nothing
// to ask: a process can be alive and still be unable to reach its database. The
// body says whether the query worked and nothing else — no version, no schema,
// no error text — because this is the one route with no authentication at all.
export const GET = withRoute("GET /api/health", async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    logger.error("health.database", err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
});
