import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ensureReceiptsFor } from "../src/lib/paymentReceiptServer";

async function main() {
  const issued = await prisma.$transaction((tx) => ensureReceiptsFor(tx, {}));
  console.log(`Receipts issued: ${issued.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
