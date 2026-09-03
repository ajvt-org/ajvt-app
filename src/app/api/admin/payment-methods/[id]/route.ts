import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { paymentMethods as messages } from "@/lib/messages";
import { readName, swappedPositions } from "@/lib/paymentMethodAdmin";
import { allPaymentMethods } from "@/lib/paymentMethodsServer";

export const PATCH = withRoute(
  "PATCH /api/admin/payment-methods/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: messages.notFound }, { status: 404 });

    if (body.move === "up" || body.move === "down") {
      const pair = swappedPositions(await allPaymentMethods(), id, body.move);
      if (!pair) return NextResponse.json({ method: existing });
      const [mine, other] = pair;
      await prisma.$transaction([
        prisma.paymentMethod.update({ where: { id: mine.id }, data: { position: other.position } }),
        prisma.paymentMethod.update({ where: { id: other.id }, data: { position: mine.position } }),
      ]);
      await logAction(session.username, "REORDER_PAYMENT_METHOD", existing.name, {
        ...auditContext(session, req),
        targetType: "PaymentMethod",
        targetId: id,
        before: { position: mine.position },
        after: { position: other.position },
      });
      return NextResponse.json({
        method: await prisma.paymentMethod.findUnique({ where: { id } }),
      });
    }

    const data: { name?: string; active?: boolean; memberFacing?: boolean } = {};

    if (body.name !== undefined) {
      const name = readName(body.name);
      if (!name) return NextResponse.json({ error: messages.nameRequired }, { status: 400 });
      if (name.length > 30) {
        return NextResponse.json({ error: messages.nameTooLong }, { status: 400 });
      }
      const clash = await prisma.paymentMethod.findUnique({ where: { name } });
      if (clash && clash.id !== id) {
        return NextResponse.json({ error: messages.exists }, { status: 409 });
      }
      data.name = name;
    }

    if (typeof body.active === "boolean") data.active = body.active;
    if (typeof body.memberFacing === "boolean") data.memberFacing = body.memberFacing;

    const method = await prisma.$transaction(async (tx) => {
      const saved = await tx.paymentMethod.update({ where: { id }, data });
      if (data.name && data.name !== existing.name) {
        await Promise.all([
          tx.expense.updateMany({ where: { method: existing.name }, data: { method: data.name } }),
          tx.payment.updateMany({ where: { method: existing.name }, data: { method: data.name } }),
          tx.donation.updateMany({
            where: { paymentMethod: existing.name },
            data: { paymentMethod: data.name },
          }),
          tx.membership.updateMany({
            where: { paymentMethod: existing.name },
            data: { paymentMethod: data.name },
          }),
        ]);
      }
      return saved;
    });

    await logAction(
      session.username,
      "UPDATE_PAYMENT_METHOD",
      `${existing.name} → ${method.name}`,
      {
        ...auditContext(session, req),
        targetType: "PaymentMethod",
        targetId: id,
        before: {
          name: existing.name,
          active: existing.active,
          memberFacing: existing.memberFacing,
        },
        after: { name: method.name, active: method.active, memberFacing: method.memberFacing },
      },
    );

    return NextResponse.json({ method });
  },
);
