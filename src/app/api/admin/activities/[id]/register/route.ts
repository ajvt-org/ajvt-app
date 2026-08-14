import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { sendPushToUser } from "@/lib/push";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { parse } from "@/lib/validation";
import { adminRegisterSchema, registrationReviewSchema } from "./schema";

export const POST = withRoute(
  "POST /api/admin/activities/[id]/register",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { id } = await params;
    const { memberId } = parse(adminRegisterSchema, await req.json());

    const [member, activity] = await Promise.all([
      prisma.member.findUnique({ where: { id: memberId }, select: { id: true, fullName: true } }),
      prisma.activity.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          capacity: true,
          _count: { select: { registrations: { where: { status: { not: "REJECTED" } } } } },
        },
      }),
    ]);
    if (!member) return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    if (!activity) return NextResponse.json({ error: "النشاط غير موجود" }, { status: 404 });

    if (activity.capacity !== null && activity._count.registrations >= activity.capacity) {
      const already = await prisma.activityRegistration.findUnique({
        where: { memberId_activityId: { memberId, activityId: id } },
      });
      if (!already) {
        return NextResponse.json({ error: "اكتمل عدد المسجلين في هذا النشاط" }, { status: 409 });
      }
    }

    // Admin-initiated registration is confirmed immediately — no review queue.
    await prisma.activityRegistration.upsert({
      where: { memberId_activityId: { memberId, activityId: id } },
      update: { status: "ACTIVE", rejectionReason: null },
      create: { memberId, activityId: id, status: "ACTIVE" },
    });

    await logAction(
      session.username,
      "ADMIN_REGISTER_ACTIVITY",
      `${member.fullName} → ${activity.title}`,
    );

    return NextResponse.json({ ok: true });
  },
);

export const PATCH = withRoute(
  "PATCH /api/admin/activities/[id]/register",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { id } = await params;
    const { registrationId, status, reason } = parse(registrationReviewSchema, await req.json());

    const registration = await prisma.activityRegistration.findUnique({
      where: { id: registrationId },
      select: {
        activityId: true,
        member: { select: { fullName: true, userId: true } },
        activity: { select: { title: true } },
      },
    });
    if (!registration || registration.activityId !== id) {
      return NextResponse.json({ error: "طلب التسجيل غير موجود" }, { status: 404 });
    }

    const updated = await prisma.activityRegistration.update({
      where: { id: registrationId },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? reason?.trim() || null : null,
      },
    });

    await logAction(
      session.username,
      status === "ACTIVE" ? "APPROVE_ACTIVITY_REGISTRATION" : "REJECT_ACTIVITY_REGISTRATION",
      `${registration.member.fullName} → ${registration.activity.title}`,
    );

    if (registration.member.userId) {
      sendPushToUser(registration.member.userId, {
        title: "رابطة شباب التاكلالت",
        body:
          status === "ACTIVE"
            ? `تم تأكيد تسجيل ${registration.member.fullName} في "${registration.activity.title}" 🎉`
            : `نأسف، لم يتم قبول تسجيل ${registration.member.fullName} في "${registration.activity.title}"${reason ? ` — ${reason.trim()}` : ""}`,
        url: "/home",
      }).catch((err) => logger.error("registration.review.push.error", err));
    }

    return NextResponse.json({ registration: updated });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/activities/[id]/register",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("ACTIVITIES");
    const { id } = await params;
    const { memberId } = parse(adminRegisterSchema, await req.json());

    await prisma.activityRegistration.deleteMany({ where: { memberId, activityId: id } });

    return NextResponse.json({ ok: true });
  },
);
