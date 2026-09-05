import "dotenv/config";
import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import {
  attachableRows,
  soleAccountByMethod,
  type AttachableRow,
} from "../src/lib/backfillAccounts";

const TABLES = ["Payment", "Membership", "Donation", "Expense"] as const;

type Table = (typeof TABLES)[number];

async function rowsOf(table: Table): Promise<AttachableRow[]> {
  const where = { accountId: null };
  if (table === "Payment") {
    const rows = await prisma.payment.findMany({ where, select: { id: true, method: true } });
    return rows.map((row) => ({ id: row.id, method: row.method }));
  }
  if (table === "Expense") {
    const rows = await prisma.expense.findMany({ where, select: { id: true, method: true } });
    return rows.map((row) => ({ id: row.id, method: row.method }));
  }
  if (table === "Membership") {
    const rows = await prisma.membership.findMany({
      where,
      select: { id: true, paymentMethod: true },
    });
    return rows.map((row) => ({ id: row.id, method: row.paymentMethod }));
  }
  const rows = await prisma.donation.findMany({
    where,
    select: { id: true, paymentMethod: true },
  });
  return rows.map((row) => ({ id: row.id, method: row.paymentMethod }));
}

async function attach(table: Table, accountId: string, ids: string[]) {
  const where = { id: { in: ids }, accountId: null };
  if (table === "Payment") return prisma.payment.updateMany({ where, data: { accountId } });
  if (table === "Expense") return prisma.expense.updateMany({ where, data: { accountId } });
  if (table === "Membership") return prisma.membership.updateMany({ where, data: { accountId } });
  return prisma.donation.updateMany({ where, data: { accountId } });
}

async function mirrorDisagreements(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "Membership" m
    JOIN "Payment" p
      ON p."userId" = m."userId" AND p."year" = m."year" AND p."purpose" = 'MEMBERSHIP'
    WHERE m."accountId" IS DISTINCT FROM p."accountId"
  `;
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  const write = process.argv.includes("--write");
  const touched: { table: Table; accountId: string; ids: string[] }[] = [];

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

  for (const table of TABLES) {
    const rows = await rowsOf(table);
    const { byAccount, skipped } = attachableRows(rows, sole);

    for (const [accountId, ids] of byAccount) {
      const code = [...sole.values()].find((a) => a.id === accountId)?.code ?? accountId;
      console.log(`  ${table} ${ids.length} rows to ${code}`);
      if (write) {
        await attach(table, accountId, ids);
        touched.push({ table, accountId, ids });
      }
    }

    for (const [reason, count] of skipped) {
      console.log(`  ${table} ${count} rows left alone, ${reason}`);
    }
    console.log("");
  }

  if (write && touched.length) {
    const path = `backfill-accounts-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}.json`;
    writeFileSync(path, JSON.stringify(touched, null, 2));
    console.log(`  Wrote ${path}, which lists every row this run attached.`);
    console.log("");
  }

  const disagreements = await mirrorDisagreements();
  console.log(
    disagreements === 0
      ? "  Every membership agrees with its mirrored payment."
      : `  ${disagreements} memberships disagree with their mirrored payment. Stop and read the mirror.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
