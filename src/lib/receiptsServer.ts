import { prisma } from "./prisma";
import { receiptView } from "./officialReceiptServer";
import type { OfficialReceiptView } from "./officialReceipt";

export async function receiptsForMember(
  where: { userId: string } | { memberId: string },
): Promise<OfficialReceiptView[]> {
  const rows = await prisma.receipt.findMany({
    where: {
      status: "ACTIVE",
      member: "memberId" in where ? { id: where.memberId } : { userId: where.userId },
    },
    orderBy: { issuedOn: "desc" },
  });
  return rows.map(receiptView);
}
