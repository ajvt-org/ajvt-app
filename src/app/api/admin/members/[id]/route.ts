import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { validatePhone } from "@/lib/utils";
import { logAction, auditContext } from "@/lib/audit";
import { validatePaidAmount } from "@/lib/donations";
import { getAppSettings } from "@/lib/settingsServer";
import { syncMembershipDonation } from "@/lib/donationsServer";
import { generateTempPassword } from "@/lib/member";
import * as bcrypt from "bcryptjs";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { adminMemberUpdateSchema } from "./schema";
import { common, members } from "@/lib/messages";

export const PATCH = withRoute(
  "PATCH /api/admin/members/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    // Renaming a player often happens while managing a tournament roster,
    // so either admin scope may do it — not just "MEMBERS". Attaching an
    // account (accountPhone) is a membership concern though, checked below.
    const session = await requireAdminRole("MEMBERS", "ACTIVITIES");
    const { id } = await params;
    const { fullName, phone, age, photo, paidAmount, accountPhone } = parse(
      adminMemberUpdateSchema,
      await req.json(),
    );

    const existing = await prisma.member.findUnique({
      where: { id },
      select: { fullName: true, userId: true, phone: true, age: true, paidAmount: true },
    });
    if (!existing) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }

    const data: {
      fullName?: string;
      phone?: string | null;
      age?: string;
      photo?: string | null;
      paidAmount?: number | null;
      userId?: string;
    } = {};

    if (fullName !== undefined) data.fullName = fullName;
    if (phone !== undefined && phone !== null) {
      const phoneError = validatePhone(phone);
      if (phoneError) return NextResponse.json({ error: phoneError }, { status: 400 });
      data.phone = phone.trim();
    }

    let tempPassword: string | undefined;
    if (accountPhone !== undefined) {
      // Attaching a login account to a member added without one — a
      // membership concern, not something a tournament-only admin needs.
      if (session.role === "ACTIVITIES") {
        return NextResponse.json({ error: common.forbidden }, { status: 403 });
      }
      if (existing.userId) {
        return NextResponse.json({ error: "لهذا العضو حساب مسبقاً" }, { status: 400 });
      }
      const phoneError = validatePhone(accountPhone);
      if (phoneError) return NextResponse.json({ error: phoneError }, { status: 400 });

      let user = await prisma.user.findUnique({ where: { phone: accountPhone.trim() } });
      if (!user) {
        tempPassword = generateTempPassword();
        const hashed = await bcrypt.hash(tempPassword, 12);
        user = await prisma.user.create({ data: { phone: accountPhone.trim(), password: hashed } });
      }
      data.userId = user.id;
      if (phone === undefined) data.phone = accountPhone.trim();
    }

    if (age !== undefined) data.age = age;
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
          phone: member.phone,
          age: member.age,
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
          after: { userId: data.userId, phone: accountPhone!.trim() },
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
      select: { fullName: true, phone: true, age: true, status: true, memberNumber: true },
    });
    if (!member) {
      return NextResponse.json({ error: members.requestNotFound }, { status: 404 });
    }

    await prisma.member.delete({ where: { id } });
    await logAction(session.username, "DELETE_MEMBER", member.fullName, {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before: member,
    });

    return NextResponse.json({ ok: true });
  },
);
