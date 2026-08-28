import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { forgetQuizFootprint } from "@/lib/quizAttemptServer";
import { ValidationError } from "@/lib/errors";
import { confirmationMatches } from "@/lib/deletedRecords";
import { archive, purgeExpired } from "@/lib/deletedRecordsServer";
import type { Prisma } from "@prisma/client";
import { parse } from "@/lib/validation";
import { adminMemberUpdateSchema } from "./schema";
import { members, villages as villageMessages } from "@/lib/messages";
import { ageForVillage, isKnownVillage, requiresAgeGroup } from "@/lib/villages";
import { villageNames } from "@/lib/villagesServer";
import { attachAccount } from "@/lib/attachAccount";

export const PATCH = withRoute(
  "PATCH /api/admin/members/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS", "ACTIVITIES");
    const { id } = await params;
    const { fullName, age, village, photo, accountPhone } = parse(
      adminMemberUpdateSchema,
      await req.json(),
    );

    const existing = await prisma.member.findUnique({
      where: { id },
      select: {
        fullName: true,
        userId: true,
        age: true,
        village: true,
        paymentMethod: true,
        paidAmount: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }

    const data: {
      fullName?: string;
      age?: string | null;
      village?: string;
      photo?: string | null;
      userId?: string;
    } = {};

    if (village !== undefined && !isKnownVillage(village, await villageNames())) {
      return NextResponse.json({ error: villageMessages.unknownVillage }, { status: 400 });
    }

    if (fullName !== undefined) data.fullName = fullName;

    let tempPassword: string | undefined;
    if (accountPhone !== undefined) {
      const attached = await attachAccount(accountPhone, {
        allowed: session.role !== "ACTIVITIES",
        alreadyAttached: !!existing.userId,
      });
      data.userId = attached.userId;
      tempPassword = attached.tempPassword;
    }

    if (village !== undefined) data.village = village;
    if (age !== undefined || village !== undefined) {
      const nextVillage = village ?? existing.village;
      const nextAge = ageForVillage(nextVillage, age === undefined ? existing.age : age);
      if (requiresAgeGroup(nextVillage) && !nextAge) {
        return NextResponse.json({ error: members.pickAgeGroup }, { status: 400 });
      }
      data.age = nextAge;
    }
    if (photo !== undefined) data.photo = photo;
    const member = await prisma.member.update({ where: { id }, data });
    await logAction(
      session.username,
      "UPDATE_MEMBER",
      `${existing.fullName} → ${member.fullName}`,
      {
        ...auditContext(session, req),
        targetType: "Member",
        targetId: member.id,
        before: existing,
        after: {
          fullName: member.fullName,
          age: member.age,
          village: member.village,
          paymentMethod: member.paymentMethod,
          paidAmount: member.paidAmount,
        },
      },
    );
    if (data.userId) {
      await logAction(
        session.username,
        "ATTACH_MEMBER_ACCOUNT",
        `${member.fullName} — ${accountPhone!.trim()}`,
        {
          ...auditContext(session, req),
          targetType: "Member",
          targetId: member.id,
          before: { userId: null },
          after: { userId: data.userId, account: accountPhone!.trim() },
        },
      );
    }

    return NextResponse.json({ member, tempPassword });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/members/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) {
      return NextResponse.json({ error: members.requestNotFound }, { status: 404 });
    }

    const { confirmName } = await req.json().catch(() => ({ confirmName: undefined }));
    if (!confirmationMatches(String(confirmName ?? ""), member.fullName)) {
      throw new ValidationError("اكتب اسم العضو كما هو للتأكيد");
    }

    await archive(
      "Member",
      id,
      member.fullName,
      member as unknown as Prisma.InputJsonValue,
      session.username,
    );
    await prisma.member.delete({ where: { id } });
    const forgotten = member.userId ? await forgetQuizFootprint(member.userId) : null;
    await purgeExpired();
    await logAction(session.username, "DELETE_MEMBER", member.fullName, {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before: { fullName: member.fullName, age: member.age, status: member.status },
      meta: forgotten ?? undefined,
    });

    return NextResponse.json({ ok: true });
  },
);
