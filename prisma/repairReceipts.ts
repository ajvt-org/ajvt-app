import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { receiptDriftFor, syncReceiptsFor } from "../src/lib/paymentReceiptServer";

function show(value: string | number | null): string {
  return value === null ? "—" : String(value);
}

async function main() {
  const apply = process.argv.includes("--apply");

  const drifted = await receiptDriftFor(prisma, {});
  const withdrawing = await prisma.receipt.count({
    where: { status: "ACTIVE", payment: { is: { status: { not: "ACTIVE" } } } },
  });
  const issuing = await prisma.payment.count({
    where: { status: "ACTIVE", receipt: { is: null } },
  });

  for (const drift of drifted) {
    console.log(`${drift.number}  ${drift.action}`);
    for (const change of drift.changes) {
      console.log(`    ${change.field}: ${show(change.from)} -> ${show(change.to)}`);
    }
  }

  console.log(`Receipts to reissue: ${drifted.filter((d) => d.action === "reissue").length}`);
  console.log(`Receipts to correct: ${drifted.filter((d) => d.action === "correct").length}`);
  console.log(`Receipts to withdraw: ${withdrawing}`);
  console.log(`Receipts to issue: ${issuing}`);

  if (!apply) {
    console.log("Dry run. Pass --apply to write.");
    return;
  }

  const issued = await syncReceiptsFor(prisma, {});
  console.log(`Receipts issued: ${issued.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
