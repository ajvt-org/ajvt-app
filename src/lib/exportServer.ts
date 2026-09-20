import { prisma } from "./prisma";
import { toCsv } from "./csv";
import { splitPayment } from "./membershipPayment";
import { getAgeStandings } from "./ageStandingsServer";
import { latestByAccount } from "./currentMembership";
import { activityFinanceReport } from "./activityReportServer";
import { dateSpanSchema, spanBounds } from "./dateSpan";
import { parse } from "./validation";
import { givenAmount, sourceOnRecord } from "./gifts";
import {
  memberRows,
  donationRows,
  ageRows,
  activityRows,
  auditRows,
  MEMBER_HEADERS,
  DONATION_HEADERS,
  AGE_HEADERS,
  ACTIVITY_HEADERS,
  AUDIT_HEADERS,
  type Dataset,
} from "./exportRows";
import { PERSON_WITH_PHONE_SELECT, withPerson } from "./person";
import {
  MEMBERSHIP_PAYMENT_SELECT,
  mirroredColumns,
  paymentOfYear,
} from "./membershipPaymentFields";
import { DONOR_ACCOUNT_SELECT } from "./donorName";
import { CONFIDENTIAL_SELECT, seesSupporterName, type SupportViewer } from "./supportPrivacy";
import { auditLogExport } from "./auditLogServer";

async function membersCsv(viewer: SupportViewer): Promise<string> {
  const memberships = await prisma.membership.findMany({
    select: {
      userId: true,
      year: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          ...PERSON_WITH_PHONE_SELECT,
          ...CONFIDENTIAL_SELECT,
          payments: { where: { purpose: "MEMBERSHIP" }, select: MEMBERSHIP_PAYMENT_SELECT },
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
        const { year, user, userId, ...rest } = membership;
        const { supportNameConfidential, ...account } = user;
        const named = seesSupporterName(viewer, { userId, user: { supportNameConfidential } });
        const paid = paymentOfYear(account.payments, year);
        const split = paid ? splitPayment(paid.amount, paid.feeApplied ?? 0) : null;
        return {
          ...withPerson({
            ...rest,
            ...mirroredColumns(paid),
            membershipYear: year,
            user: account,
          }),
          paidAmount: split ? split.fee : null,
          supportAmount: named && split ? split.surplus : 0,
        };
      }),
    ),
  );
}

async function donationsCsv(viewer: SupportViewer): Promise<string> {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "asc" },
    include: { user: { select: DONOR_ACCOUNT_SELECT }, tags: { select: { name: true } } },
  });

  return toCsv(
    DONATION_HEADERS,
    donationRows(
      payments
        .map((payment) => ({
          ...payment,
          amount: givenAmount(payment),
          paymentMethod: payment.method,
          source: sourceOnRecord(payment.purpose, payment.source),
        }))
        .filter((payment) => payment.purpose !== "MEMBERSHIP" || payment.amount > 0),
      viewer,
    ),
  );
}

async function activitiesCsv(params: URLSearchParams): Promise<string> {
  const { from, to } = parse(dateSpanSchema, {
    from: params.get("from"),
    to: params.get("to"),
  });
  const span = spanBounds(from, to);
  const report = await activityFinanceReport(span.from, span.to);
  return toCsv(ACTIVITY_HEADERS, activityRows(report.rows));
}

export async function datasetCsv(
  dataset: Dataset,
  params: URLSearchParams,
  viewer: SupportViewer,
): Promise<string> {
  if (dataset === "members") return membersCsv(viewer);
  if (dataset === "donations") return donationsCsv(viewer);
  if (dataset === "activities") return activitiesCsv(params);
  if (dataset === "audit") {
    return toCsv(AUDIT_HEADERS, auditRows(await auditLogExport(params, viewer)));
  }
  return toCsv(AGE_HEADERS, ageRows(await getAgeStandings({ everyGroup: true })));
}
