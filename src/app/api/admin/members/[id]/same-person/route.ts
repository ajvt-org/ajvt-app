import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { findSamePerson } from "@/lib/samePersonServer";

export const GET = withRoute(
  "GET /api/admin/members/[id]/same-person",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("MEMBERS");
    const { id } = await params;
    return NextResponse.json({ others: await findSamePerson(id) });
  },
);
