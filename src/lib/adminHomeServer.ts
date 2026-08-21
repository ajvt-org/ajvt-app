import { prisma } from "./prisma";
import { getAppSettings } from "./settingsServer";
import { membershipStanding, needsHandling, netMoney } from "./adminHome";

export async function adminHomeSummary() {
  const settings = await getAppSettings();

  const [members, payments, expenses, pendingMembers, pendingRegistrations, pendingPayments] =
    await Promise.all([
      prisma.member.findMany({
        select: { status: true, membershipYear: true, paidAmount: true },
      }),
      prisma.payment.aggregate({ where: { status: "ACTIVE" }, _sum: { amount: true } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.member.count({ where: { status: "PENDING" } }),
      prisma.activityRegistration.count({ where: { status: "PENDING" } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
    ]);

  const revenue = payments._sum.amount ?? 0;
  const spending = expenses._sum.amount ?? 0;
  const counts = { pendingMembers, pendingRegistrations, pendingPayments };

  return {
    year: settings.membershipYear,
    membership: membershipStanding(members, settings.membershipYear, settings.membershipFee),
    money: { revenue, spending, net: netMoney(revenue, spending) },
    handling: { ...counts, total: needsHandling(counts) },
  };
}
