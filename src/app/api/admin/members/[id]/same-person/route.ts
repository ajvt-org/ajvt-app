import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { findSamePerson } from "@/lib/samePersonServer";

// Asked per member rather than folded into the list: a reviewer looks at one
// request at a time, and the answer is a scan the list does not need.
export const GET = withRoute(
  "GET /api/admin/members/[id]/same-person",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("MEMBERS");
    const { id } = await params;
    return NextResponse.json({ others: await findSamePerson(id) });
  },
);
