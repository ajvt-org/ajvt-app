import { prisma } from "./prisma";
import { receiptView } from "./officialReceiptServer";
import type { OfficialReceiptView } from "./officialReceipt";

export async function receiptsForAccount(userId: string): Promise<OfficialReceiptView[]> {
  const rows = await prisma.receipt.findMany({
    where: { status: "ACTIVE", userId },
    orderBy: { issuedOn: "desc" },
  });
  return rows.map(receiptView);
}
