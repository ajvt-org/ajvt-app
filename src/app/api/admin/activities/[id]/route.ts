import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { activityUpdateSchema } from "./schema";

export const PATCH = withRoute(
  "PATCH /api/admin/activities/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { id } = await params;
    const {
      title,
      description,
      period,
      capacity,
      isOpen,
      photo,
      isTournament,
      isVolunteer,
      whatsappLink,
      order,
      startsAt,
      endsAt,
      withTime,
    } = parse(activityUpdateSchema, await req.json());

    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "النشاط غير موجود" }, { status: 404 });
    }

    const data: {
      title?: string;
      description?: string;
      period?: string | null;
      capacity?: number | null;
      isOpen?: boolean;
      photo?: string | null;
      isTournament?: boolean;
      isVolunteer?: boolean;
      whatsappLink?: string | null;
      order?: number;
      startsAt?: Date | null;
      endsAt?: Date | null;
      withTime?: boolean;
    } = {};

    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (period !== undefined) data.period = period?.trim() || null;
    if (capacity !== undefined) data.capacity = capacity;
    if (isOpen !== undefined) data.isOpen = !!isOpen;
    if (photo !== undefined) data.photo = photo;
    if (isTournament !== undefined) data.isTournament = !!isTournament;
    if (isVolunteer !== undefined) data.isVolunteer = !!isVolunteer;
    if (whatsappLink !== undefined) data.whatsappLink = whatsappLink?.trim() || null;
    if (order !== undefined) data.order = Number(order);
    if (startsAt !== undefined) data.startsAt = startsAt;
    if (endsAt !== undefined) data.endsAt = endsAt;
    if (withTime !== undefined) data.withTime = !!withTime;

    const nextIsTournament = data.isTournament ?? existing.isTournament;
    const nextIsVolunteer = data.isVolunteer ?? existing.isVolunteer;
    if (nextIsTournament && nextIsVolunteer) {
      return NextResponse.json(
        { error: "لا يمكن أن يكون النشاط بطولة وحملة تطوعية في آن واحد" },
        { status: 400 },
      );
    }
    const nextWhatsappLink =
      data.whatsappLink !== undefined ? data.whatsappLink : existing.whatsappLink;
    if (nextIsVolunteer && !/^https?:\/\//.test(nextWhatsappLink || "")) {
      return NextResponse.json(
        { error: "رابط مجموعة الواتساب مطلوب لحملات التطوع" },
        { status: 400 },
      );
    }

    const activity = await prisma.activity.update({ where: { id }, data });
    await logAction(session.username, "UPDATE_ACTIVITY", activity.title, {
      ...auditContext(session, req),
      targetType: "Activity",
      targetId: activity.id,
      before: existing,
      after: {
        title: activity.title,
        period: activity.period,
        capacity: activity.capacity,
        isOpen: activity.isOpen,
        isTournament: activity.isTournament,
        isVolunteer: activity.isVolunteer,
        whatsappLink: activity.whatsappLink,
        startsAt: activity.startsAt,
        endsAt: activity.endsAt,
        withTime: activity.withTime,
      },
    });

    return NextResponse.json({ activity });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/activities/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { id } = await params;

    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) {
      return NextResponse.json({ error: "النشاط غير موجود" }, { status: 404 });
    }

    await prisma.activity.delete({ where: { id } });
    await logAction(session.username, "DELETE_ACTIVITY", activity.title, {
      ...auditContext(session, req),
      targetType: "Activity",
      targetId: id,
      before: activity,
    });

    return NextResponse.json({ ok: true });
  },
);
