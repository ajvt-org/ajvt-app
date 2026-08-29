import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ensureReceiptsFor } from "../src/lib/paymentReceiptServer";

async function main() {
  const [active, already] = await Promise.all([
    prisma.payment.count({ where: { status: "ACTIVE" } }),
    prisma.receipt.count({ where: { paymentId: { not: null } } }),
  ]);
  console.log(`${active} accepted payments, ${already} already carry a receipt`);

  const issued = await ensureReceiptsFor(prisma, {});
  console.log(`${issued.length} receipts issued`);
  for (const receipt of issued) {
    console.log(`  ${receipt.number}  ${receipt.payerName}  ${receipt.amount}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
