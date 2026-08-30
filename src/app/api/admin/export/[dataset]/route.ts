import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { NotFoundError } from "@/lib/errors";
import { toCsv } from "@/lib/csv";
import { splitPayment } from "@/lib/membershipPayment";
import { getAgeStandings } from "@/lib/ageStandingsServer";
import { latestByAccount } from "@/lib/currentMembership";
import { activityFinanceReport } from "@/lib/activityReportServer";
import { dateSpanSchema, spanBounds } from "@/lib/dateSpan";
import { parse } from "@/lib/validation";
import {
  isDataset,
  memberRows,
  donationRows,
  ageRows,
  activityRows,
  sourceOf,
  MEMBER_HEADERS,
  DONATION_HEADERS,
  AGE_HEADERS,
  ACTIVITY_HEADERS,
  FILENAMES,
  type Dataset,
} from "@/lib/exportRows";
import { PERSON_WITH_PHONE_SELECT, withPerson } from "@/lib/person";

async function buildCsv(dataset: Dataset, req: NextRequest): Promise<string> {
  if (dataset === "members") {
    const memberships = await prisma.membership.findMany({
      select: {
        userId: true,
        year: true,
        status: true,
        paymentMethod: true,
        referenceCode: true,
        createdAt: true,
        user: {
          select: {
            ...PERSON_WITH_PHONE_SELECT,
            payments: {
              where: { purpose: "MEMBERSHIP" },
              select: { amount: true, feeApplied: true, year: true },
            },
          },
        },
      },
    });
    const current = [...latestByAccount(memberships).values()].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    return toCsv(
      MEMBER_HEADERS,
      memberRows(
        current.map((membership) => {
          const { year, user, ...rest } = membership;
          const paid = user.payments.find((p) => p.year === year);
          const split = paid ? splitPayment(paid.amount, paid.feeApplied ?? 0) : null;
          return {
            ...withPerson({ ...rest, membershipYear: year, user }),
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
        user: { select: { fullName: true } },
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
            source: sourceOf(p.purpose, p.userId),
          }))
          .filter((p) => p.purpose !== "MEMBERSHIP" || p.amount > 0),
      ),
    );
  }

  if (dataset === "activities") {
    const { from, to } = parse(dateSpanSchema, {
      from: req.nextUrl.searchParams.get("from"),
      to: req.nextUrl.searchParams.get("to"),
    });
    const span = spanBounds(from, to);
    const report = await activityFinanceReport(span.from, span.to);
    return toCsv(ACTIVITY_HEADERS, activityRows(report.rows));
  }

  return toCsv(AGE_HEADERS, ageRows(await getAgeStandings()));
}

export const GET = withRoute(
  "GET /api/admin/export/[dataset]",
  async (req: NextRequest, { params }: { params: Promise<{ dataset: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const { dataset } = await params;
    if (!isDataset(dataset)) throw new NotFoundError("لا يوجد تصدير بهذا الاسم");

    const csv = await buildCsv(dataset, req);
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
