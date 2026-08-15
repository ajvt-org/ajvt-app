import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { activityCreateSchema } from "./schema";

export const GET = withRoute("GET /api/admin/activities", async () => {
  await requireAdminRole("ACTIVITIES");

  const activities = await prisma.activity.findMany({
    orderBy: { order: "asc" },
    include: {
      registrations: {
        select: {
          id: true,
          status: true,
          paymentProof: true,
          rejectionReason: true,
          createdAt: true,
          member: { select: { id: true, fullName: true, phone: true, age: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ activities });
});

export const POST = withRoute("POST /api/admin/activities", async (req: NextRequest) => {
  const session = await requireAdminRole("ACTIVITIES");
  const { title, description, period, capacity, photo, isTournament, isVolunteer, whatsappLink } =
    parse(activityCreateSchema, await req.json());

  if (isTournament && isVolunteer) {
    return NextResponse.json(
      { error: "لا يمكن أن يكون النشاط بطولة وحملة تطوعية في آن واحد" },
      { status: 400 },
    );
  }
  if (isVolunteer && !/^https?:\/\//.test(whatsappLink?.trim() || "")) {
    return NextResponse.json(
      { error: "رابط مجموعة الواتساب مطلوب لحملات التطوع" },
      { status: 400 },
    );
  }

  const { _max } = await prisma.activity.aggregate({ _max: { order: true } });

  const activity = await prisma.activity.create({
    data: {
      title,
      description,
      period: period?.trim() || null,
      photo: photo || null,
      capacity: capacity ?? null,
      isTournament: !!isTournament,
      isVolunteer: !!isVolunteer,
      whatsappLink: isVolunteer ? whatsappLink!.trim() : null,
      order: (_max.order ?? -1) + 1,
    },
  });

  await logAction(session.username, "CREATE_ACTIVITY", activity.title, {
    ...auditContext(session, req),
    targetType: "Activity",
    targetId: activity.id,
    after: {
      title: activity.title,
      period: activity.period,
      capacity: activity.capacity,
      isTournament: activity.isTournament,
      isVolunteer: activity.isVolunteer,
    },
  });

  return NextResponse.json({ activity }, { status: 201 });
});
