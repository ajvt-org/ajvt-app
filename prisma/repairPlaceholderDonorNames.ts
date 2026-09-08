import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { money } from "../src/lib/messages";

function holdsThePlaceholder(donorName: string | null): boolean {
  return donorName !== null && donorName.trim() === money.anonymousDonor;
}

async function donationsHoldingIt() {
  const rows = await prisma.donation.findMany({
    where: { donorName: { not: null } },
    select: { id: true, donorName: true, anonymous: true },
  });
  return rows.filter((row) => holdsThePlaceholder(row.donorName));
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

  const donations = await donationsHoldingIt();
  const payments = await paymentsHoldingIt();
  const shownOnTheBoard = counted(donations);
  const mirrored = counted(payments);

  console.log(`Donations holding the label as a name: ${donations.length}`);
  console.log(`    also anonymous, so no reader sees a change: ${shownOnTheBoard.hidden}`);
  console.log(
    `    not anonymous, so the board loses a named supporter: ${shownOnTheBoard.published}`,
  );
  console.log(`Payments holding the label as a name: ${payments.length}`);
  console.log(`    also anonymous: ${mirrored.hidden}`);
  console.log(`    not anonymous: ${mirrored.published}`);

  if (shownOnTheBoard.published > 0 || mirrored.published > 0) {
    console.log("A row that is not anonymous is holding the label. Read it before applying.");
  }

  if (!apply) {
    console.log("Dry run. Pass --apply to write.");
    return;
  }

  const clearedDonations = await prisma.donation.updateMany({
    where: { id: { in: donations.map((row) => row.id) } },
    data: { donorName: null },
  });
  const clearedPayments = await prisma.payment.updateMany({
    where: { id: { in: payments.map((row) => row.id) } },
    data: { donorName: null },
  });

  console.log(`Donations cleared: ${clearedDonations.count}`);
  console.log(`Payments cleared: ${clearedPayments.count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
