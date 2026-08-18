import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { validatePaidAmount } from "@/lib/donations";
import { getAppSettings } from "@/lib/settingsServer";
import { recordMembershipPayment } from "@/lib/membershipPaymentServer";
import { syncMembershipRecord } from "@/lib/membershipRecord";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { confirmationMatches } from "@/lib/deletedRecords";
import { archive, purgeExpired } from "@/lib/deletedRecordsServer";
import type { Prisma } from "@prisma/client";
import { parse } from "@/lib/validation";
import { adminMemberUpdateSchema } from "./schema";
import { members } from "@/lib/messages";
import { attachAccount } from "@/lib/attachAccount";

export const PATCH = withRoute(
  "PATCH /api/admin/members/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS", "ACTIVITIES");
    const { id } = await params;
    const { fullName, age, paymentMethod, photo, paidAmount, accountPhone } = parse(
      adminMemberUpdateSchema,
      await req.json(),
    );

    const existing = await prisma.member.findUnique({
      where: { id },
      select: {
        fullName: true,
        userId: true,
        age: true,
        paymentMethod: true,
        paidAmount: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }

    const data: {
      fullName?: string;
      age?: string;
      paymentMethod?: string;
      photo?: string | null;
      paidAmount?: number | null;
      userId?: string;
    } = {};

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

    if (age !== undefined) data.age = age;
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
    if (photo !== undefined) data.photo = photo;
    const { membershipFee } = await getAppSettings();
    let newTotal: number | null | undefined;
    if (paidAmount !== undefined) {
      if (paidAmount === null) {
        newTotal = null;
      } else {
        const paidAmountError = validatePaidAmount(paidAmount, membershipFee);
        if (paidAmountError) return NextResponse.json({ error: paidAmountError }, { status: 400 });
        newTotal = Number(paidAmount);
      }
    }

    const member = await prisma.$transaction(async (tx) => {
      const m = await tx.member.update({ where: { id }, data });
      if (newTotal !== undefined) {
        await recordMembershipPayment(tx, id, newTotal, membershipFee);
      }
      await syncMembershipRecord(tx, id, m.membershipYear, {
        ...data,
        ...(newTotal !== undefined
          ? { paidAmount: newTotal === null ? null : Math.min(newTotal, membershipFee) }
          : {}),
      });
      return tx.member.findUniqueOrThrow({ where: { id } });
    });
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
    await purgeExpired();
    await logAction(session.username, "DELETE_MEMBER", member.fullName, {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before: { fullName: member.fullName, age: member.age, status: member.status },
    });

    return NextResponse.json({ ok: true });
  },
);
