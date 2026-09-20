import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";
import { members } from "@/lib/messages";
import { memberSelfSchema } from "./schema";
import { ownMembership, updateOwnAccount } from "@/lib/selfMemberReadServer";

export const GET = withRoute(
  "GET /api/members/[id]",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await params;

    if (id !== session.userId) throw new NotFoundError(members.notFound);

    return NextResponse.json(await ownMembership(session.userId));
  },
);

export const PATCH = withRoute(
  "PATCH /api/members/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await params;
    const edit = parse(memberSelfSchema, await req.json());

    if (id !== session.userId) throw new NotFoundError(members.notFound);

    return NextResponse.json(await updateOwnAccount(session.userId, edit));
  },
);
