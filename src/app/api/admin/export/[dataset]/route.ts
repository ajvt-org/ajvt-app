import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { NotFoundError } from "@/lib/errors";
import { toCsv } from "@/lib/csv";
import { splitPayment } from "@/lib/membershipPayment";
import { getAgeStandings } from "@/lib/ageStandingsServer";
import {
  isDataset,
  memberRows,
  donationRows,
  ageRows,
  sourceOf,
  MEMBER_HEADERS,
  DONATION_HEADERS,
  AGE_HEADERS,
  FILENAMES,
  type Dataset,
} from "@/lib/exportRows";
import { withPerson } from "@/lib/person";

async function buildCsv(dataset: Dataset): Promise<string> {
  if (dataset === "members") {
    const members = await prisma.member.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            phone: true,
            fullName: true,
            age: true,
            village: true,
            photo: true,
            photoLocked: true,
            memberNumber: true,
            verifyToken: true,
          },
        },
        payments: {
          where: { purpose: "MEMBERSHIP" },
          select: { amount: true, feeApplied: true, year: true },
        },
      },
    });
    return toCsv(
      MEMBER_HEADERS,
      memberRows(
        members.map((m) => {
          const paid = m.payments.find((p) => p.year === m.membershipYear);
          const split = paid ? splitPayment(paid.amount, paid.feeApplied ?? 0) : null;
          return {
            ...withPerson(m),
            paidAmount: split ? split.fee : null,
            supportAmount: split ? split.surplus : 0,
          };
        }),
      ),
    );
  }

  if (dataset === "donations") {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        member: { select: { user: { select: { fullName: true } } } },
        tags: { select: { name: true } },
      },
    });
    return toCsv(
      DONATION_HEADERS,
      donationRows(
        payments
          .map((p) => ({
            ...p,
            amount:
              p.purpose === "MEMBERSHIP"
                ? splitPayment(p.amount, p.feeApplied ?? 0).surplus
                : p.amount,
            paymentMethod: p.method,
            source: sourceOf(p.purpose, p.memberId),
          }))
          .filter((p) => p.purpose !== "MEMBERSHIP" || p.amount > 0),
      ),
    );
  }

  return toCsv(AGE_HEADERS, ageRows(await getAgeStandings()));
}

export const GET = withRoute(
  "GET /api/admin/export/[dataset]",
  async (req: NextRequest, { params }: { params: Promise<{ dataset: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const { dataset } = await params;
    if (!isDataset(dataset)) throw new NotFoundError("لا يوجد تصدير بهذا الاسم");

    const csv = await buildCsv(dataset);
    const day = new Date().toISOString().slice(0, 10);

    await logAction(session.username, "EXPORT_DATA", dataset, {
      ...auditContext(session, req),
      targetType: "Export",
      targetId: dataset,
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${FILENAMES[dataset]}-${day}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  },
);
