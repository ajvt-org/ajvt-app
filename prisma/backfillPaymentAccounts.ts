import "dotenv/config";
import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import {
  MONEY_TABLES,
  attachableRows,
  soleAccountByMethod,
  totalOf,
  type AttachPlan,
  type AttachableRow,
  type MoneyTable,
} from "../src/lib/backfillAccounts";
import { attachPlanned } from "../src/lib/backfillAccountsServer";

async function rowsOf(table: MoneyTable): Promise<AttachableRow[]> {
  const where = { accountId: null };
  if (table === "Payment") {
    const rows = await prisma.payment.findMany({
      where,
      select: { id: true, method: true, amount: true },
    });
    return rows.map((row) => ({ id: row.id, method: row.method, amount: row.amount }));
  }
  const rows = await prisma.expense.findMany({
    where,
    select: { id: true, method: true, amount: true },
  });
  return rows.map((row) => ({ id: row.id, method: row.method, amount: row.amount }));
}

async function main() {
  const write = process.argv.includes("--write");
  const touched: AttachPlan[] = [];

  const methods = await prisma.paymentMethod.findMany({
    select: { name: true, accounts: { select: { id: true, code: true, closedAt: true } } },
  });
  const sole = soleAccountByMethod(methods);

  console.log(write ? "Writing." : "Dry run, nothing is written.");
  console.log("");
  for (const [name, account] of sole) {
    console.log(`  ${name} attaches to ${account.code}`);
  }
  const several = methods.filter((m) => m.accounts.length > 1);
  for (const method of several) {
    console.log(`  ${method.name} has more than one number and is left alone`);
  }
  console.log("");

  for (const table of MONEY_TABLES) {
    const rows = await rowsOf(table);
    const { byAccount, skipped, unmatched } = attachableRows(rows, sole);

    for (const [accountId, attaching] of byAccount) {
      const code = [...sole.values()].find((a) => a.id === accountId)?.code ?? accountId;
      const ids = attaching.map((row) => row.id);
      console.log(`  ${table} ${ids.length} rows to ${code}, ${totalOf(attaching)} in total`);
      touched.push({ table, accountId, ids });
    }

    for (const [reason, count] of skipped) {
      console.log(`  ${table} ${count} rows left alone, ${reason}`);
    }

    for (const [name, count] of unmatched) {
      console.log(`  ${table} ${count} of those name ${name}`);
    }
    console.log("");
  }

  if (write && touched.length) {
    const path = `backfill-accounts-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}.json`;
    writeFileSync(path, JSON.stringify(touched, null, 2));
    console.log(`  Wrote ${path}, which lists every row this run is about to attach.`);

    await attachPlanned(prisma, touched);

    console.log("  Attached them all in one go.");
    console.log("");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
