import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { money } from "../src/lib/messages";

function holdsThePlaceholder(donorName: string | null): boolean {
  return donorName !== null && donorName.trim() === money.anonymousDonor;
}

async function paymentsHoldingIt() {
  const rows = await prisma.payment.findMany({
    where: { donorName: { not: null } },
    select: { id: true, donorName: true, anonymous: true },
  });
  return rows.filter((row) => holdsThePlaceholder(row.donorName));
}

function counted(rows: { anonymous: boolean }[]) {
  const hidden = rows.filter((row) => row.anonymous).length;
  return { hidden, published: rows.length - hidden };
}

async function main() {
  const apply = process.argv.includes("--apply");

  const payments = await paymentsHoldingIt();
  const shownOnTheBoard = counted(payments);

  console.log(`Payments holding the label as a name: ${payments.length}`);
  console.log(`    also anonymous, so no reader sees a change: ${shownOnTheBoard.hidden}`);
  console.log(
    `    not anonymous, so the board loses a named supporter: ${shownOnTheBoard.published}`,
  );

  if (shownOnTheBoard.published > 0) {
    console.log("A row that is not anonymous is holding the label. Read it before applying.");
  }

  if (!apply) {
    console.log("Dry run. Pass --apply to write.");
    return;
  }

  const cleared = await prisma.payment.updateMany({
    where: { id: { in: payments.map((row) => row.id) } },
    data: { donorName: null },
  });

  console.log(`Payments cleared: ${cleared.count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
