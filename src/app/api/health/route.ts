import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";

export const GET = withRoute("GET /api/health", async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    logger.error("health.database", err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
});
