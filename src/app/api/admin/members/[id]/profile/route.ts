import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { isOwner } from "@/lib/adminRoles";
import { withRoute } from "@/lib/route";
import { members as messages } from "@/lib/messages";
import { viewerOf } from "@/lib/supportViewer";
import { memberProfile } from "@/lib/memberProfileServer";

export const GET = withRoute(
  "GET /api/admin/members/[id]/profile",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS", "ACTIVITIES");
    const { id } = await params;

    const profile = await memberProfile(id, viewerOf(session), isOwner(session.role));
    if (!profile) return NextResponse.json({ error: messages.notFound }, { status: 404 });

    return NextResponse.json(profile);
  },
);
