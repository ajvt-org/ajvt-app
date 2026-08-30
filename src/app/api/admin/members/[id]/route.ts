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
import { nameOf } from "@/lib/person";

export const PATCH = withRoute(
  "PATCH /api/admin/members/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS", "ACTIVITIES");
    const { id } = await params;
    const { fullName, age, village, photo, photoLocked, accountPhone } = parse(
      adminMemberUpdateSchema,
      await req.json(),
    );

    const existing = await prisma.member.findUnique({
      where: { id },
      select: {
        userId: true,
        user: {
          select: {
            fullName: true,
            age: true,
            village: true,
            photo: true,
            photoLocked: true,
          },
        },
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
      photoLocked?: boolean;
    } = {};

    if (village !== undefined && !isKnownVillage(village, await villageNames())) {
      return NextResponse.json({ error: villageMessages.unknownVillage }, { status: 400 });
    }

    if (fullName !== undefined) data.fullName = fullName;

    let tempPassword: string | undefined;
    let attachedUserId: string | undefined;
    if (accountPhone !== undefined) {
      const attached = await attachAccount(id, accountPhone, {
        allowed: session.role !== "ACTIVITIES",
      });
      attachedUserId = attached.userId;
      tempPassword = attached.tempPassword;
    }

    if (village !== undefined) data.village = village;
    if (age !== undefined || village !== undefined) {
      const nextVillage = village ?? existing.user.village;
      const nextAge = ageForVillage(nextVillage, age === undefined ? existing.user.age : age);
      if (requiresAgeGroup(nextVillage) && !nextAge) {
        return NextResponse.json({ error: members.pickAgeGroup }, { status: 400 });
      }
      data.age = nextAge;
    }
    if (photo !== undefined) data.photo = photo;
    if (photoLocked !== undefined) {
      data.photoLocked = photoLocked;
      if (photoLocked) data.photo = null;
    }
    const member = await prisma.member.findUniqueOrThrow({ where: { id } });
    const person = await prisma.user.update({
      where: { id: member.userId },
      data,
      select: { fullName: true, age: true, village: true },
    });
    await logAction(
      session.username,
      "UPDATE_MEMBER",
      `${nameOf(existing.user)} → ${nameOf(person)}`,
      {
        ...auditContext(session, req),
        targetType: "Member",
        targetId: member.id,
        before: { ...existing.user },
        after: {
          fullName: person.fullName,
          age: person.age,
          village: person.village,
        },
      },
    );
    if (photo === null && existing.user.photo !== null) {
      await logAction(session.username, "REMOVE_MEMBER_PHOTO", nameOf(person), {
        ...auditContext(session, req),
        targetType: "Member",
        targetId: member.id,
        before: { photo: existing.user.photo },
        after: { photo: null },
      });
    }
    if (photoLocked !== undefined && photoLocked !== existing.user.photoLocked) {
      await logAction(
        session.username,
        photoLocked ? "LOCK_MEMBER_PHOTO" : "UNLOCK_MEMBER_PHOTO",
        nameOf(person),
        {
          ...auditContext(session, req),
          targetType: "Member",
          targetId: member.id,
          before: { photoLocked: existing.user.photoLocked },
          after: { photoLocked },
        },
      );
    }
    if (attachedUserId) {
      await logAction(
        session.username,
        "ATTACH_MEMBER_ACCOUNT",
        `${nameOf(person)} — ${accountPhone!.trim()}`,
        {
          ...auditContext(session, req),
          targetType: "Member",
          targetId: member.id,
          before: { userId: null },
          after: { userId: attachedUserId, account: accountPhone!.trim() },
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

    const member = await prisma.member.findUnique({
      where: { id },
      include: { user: { select: { fullName: true, age: true } } },
    });
    if (!member) {
      return NextResponse.json({ error: members.requestNotFound }, { status: 404 });
    }

    const { confirmName } = await req.json().catch(() => ({ confirmName: undefined }));
    if (!confirmationMatches(String(confirmName ?? ""), nameOf(member.user))) {
      throw new ValidationError("اكتب اسم العضو كما هو للتأكيد");
    }

    const { user: person, ...membership } = member;
    const years = await prisma.membership.findMany({ where: { userId: member.userId } });
    await archive(
      "Member",
      id,
      nameOf(person),
      { ...membership, memberships: years } as unknown as Prisma.InputJsonValue,
      session.username,
    );
    await prisma.$transaction([
      prisma.membership.deleteMany({ where: { userId: member.userId } }),
      prisma.member.delete({ where: { id } }),
    ]);
    const forgotten = await forgetQuizFootprint(member.userId);
    await purgeExpired();
    await logAction(session.username, "DELETE_MEMBER", nameOf(member.user), {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before: { fullName: person.fullName, age: person.age },
      meta: forgotten ?? undefined,
    });

    return NextResponse.json({ ok: true });
  },
);
