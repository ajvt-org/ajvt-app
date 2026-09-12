import type { Prisma, PrismaClient } from "@prisma/client";
import { receiptNumber } from "./officialReceipt";

type Db = PrismaClient | Prisma.TransactionClient;

export async function nextReceiptNumber(db: Db, year: number): Promise<string> {
  const counter = await db.counter.upsert({
    where: { id: `receipt:${year}` },
    update: { value: { increment: 1 } },
    create: { id: `receipt:${year}`, value: 1 },
  });
  return receiptNumber(year, counter.value);
}
