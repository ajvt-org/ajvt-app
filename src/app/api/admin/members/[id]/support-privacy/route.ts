import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { members as messages } from "@/lib/messages";
import { setSupportNameConfidential } from "@/lib/supportPrivacyServer";
import { supportPrivacySchema } from "./schema";

export const PUT = withRoute(
  "PUT /api/admin/members/[id]/support-privacy",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireOwner();
    const { id } = await params;
    const { confidential } = parse(supportPrivacySchema, await req.json());

    const result = await setSupportNameConfidential(
      id,
      confidential,
      session.username,
      auditContext(session, req),
    );
    if (!result) return NextResponse.json({ error: messages.notFound }, { status: 404 });

    return NextResponse.json(result);
  },
);
