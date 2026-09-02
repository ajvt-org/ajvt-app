import { prisma } from "./prisma";
import { receiptView } from "./officialReceiptServer";
import type { OfficialReceiptView } from "./officialReceipt";
import { CONFIDENTIAL_SELECT, seesPaymentIdentity, type SupportViewer } from "./supportPrivacy";

export async function receiptsForAccount(
  userId: string,
  viewer: SupportViewer,
): Promise<OfficialReceiptView[]> {
  const rows = await prisma.receipt.findMany({
    where: { status: "ACTIVE", userId },
    orderBy: { issuedOn: "desc" },
    include: {
      payment: {
        select: {
          purpose: true,
          amount: true,
          feeApplied: true,
          userId: true,
          user: { select: CONFIDENTIAL_SELECT },
        },
      },
    },
  });
  return rows
    .filter((row) => !row.payment || seesPaymentIdentity(viewer, row.payment))
    .map(receiptView);
}
