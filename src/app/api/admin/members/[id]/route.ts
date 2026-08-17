import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { validatePhone } from "@/lib/utils";
import { logAction, auditContext } from "@/lib/audit";
import { validatePaidAmount } from "@/lib/donations";
import { getAppSettings } from "@/lib/settingsServer";
import { syncMembershipDonation } from "@/lib/donationsServer";
import { generateTempPassword } from "@/lib/member";
import { tempPasswordExpiry } from "@/lib/tempPassword";
import * as bcrypt from "bcryptjs";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { confirmationMatches } from "@/lib/deletedRecords";
import { archive, purgeExpired } from "@/lib/deletedRecordsServer";
import type { Prisma } from "@prisma/client";
import { ConflictError } from "@/lib/errors";
import { parse } from "@/lib/validation";
import { adminMemberUpdateSchema } from "./schema";
import { common, members } from "@/lib/messages";

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
      if (session.role === "ACTIVITIES") {
        return NextResponse.json({ error: common.forbidden }, { status: 403 });
      }
      if (existing.userId) {
        return NextResponse.json({ error: "لهذا العضو حساب مسبقاً" }, { status: 400 });
      }
      const phoneError = validatePhone(accountPhone);
      if (phoneError) return NextResponse.json({ error: phoneError }, { status: 400 });

      const found = await prisma.user.findUnique({
        where: { phone: accountPhone.trim() },
        select: { id: true, members: { select: { id: true }, take: 1 } },
      });
      if (found?.members.length) {
        throw new ConflictError(members.accountAlreadyHasMember);
      }
      let userId = found?.id;
      if (!userId) {
        tempPassword = generateTempPassword();
        const { tempPasswordHours } = await getAppSettings();
        const created = await prisma.user.create({
          data: {
            phone: accountPhone.trim(),
            password: await bcrypt.hash(tempPassword, 12),
            tempPasswordExpiresAt: tempPasswordExpiry(tempPasswordHours),
          },
        });
        userId = created.id;
      }
      data.userId = userId;
    }

    if (age !== undefined) data.age = age;
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
    if (photo !== undefined) data.photo = photo;
    if (paidAmount !== undefined) {
      if (paidAmount === null) {
        data.paidAmount = null;
      } else {
        const paidAmountError = validatePaidAmount(
          paidAmount,
          (await getAppSettings()).membershipFee,
        );
        if (paidAmountError) return NextResponse.json({ error: paidAmountError }, { status: 400 });
        data.paidAmount = Number(paidAmount);
      }
    }

    const member = await prisma.$transaction(async (tx) => {
      const m = await tx.member.update({ where: { id }, data });
      await syncMembershipDonation(tx, id);
      return m;
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
