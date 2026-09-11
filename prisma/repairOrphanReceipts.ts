import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type Attribution = "issued-by-hand" | "person-deleted" | "unexplained";

function normalise(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function jsonField(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return (value as Record<string, unknown>)[key];
}

async function handIssued(): Promise<{ ids: Set<string>; numbers: Set<string> }> {
  const rows = await prisma.auditLog.findMany({
    where: { action: "ISSUE_RECEIPT" },
    select: { targetId: true, after: true },
  });
  const ids = new Set<string>();
  const numbers = new Set<string>();
  for (const row of rows) {
    if (row.targetId) ids.add(row.targetId);
    const number = normalise(readString(jsonField(row.after, "number")));
    if (number) numbers.add(number);
  }
  return { ids, numbers };
}

async function deletedPeople(): Promise<Set<string>> {
  const names = new Set<string>();

  const archived = await prisma.deletedRecord.findMany({
    where: { kind: "User" },
    select: { label: true },
  });
  for (const row of archived) {
    const label = normalise(row.label);
    if (label) names.add(label);
  }

  const logs = await prisma.auditLog.findMany({
    where: { action: "DELETE_USER" },
    select: { targetLabel: true, before: true },
  });
  for (const row of logs) {
    const label = normalise(row.targetLabel);
    if (label) names.add(label);
    const fullName = normalise(readString(jsonField(row.before, "fullName")));
    if (fullName) names.add(fullName);
  }

  return names;
}

async function main() {
  const detached = await prisma.receipt.findMany({
    where: { status: "ACTIVE", paymentId: null },
    orderBy: { number: "asc" },
    select: { id: true, number: true, payerName: true, reason: true, createdAt: true },
  });

  const hand = await handIssued();
  const deleted = await deletedPeople();

  const tally: Record<Attribution, number> = {
    "issued-by-hand": 0,
    "person-deleted": 0,
    unexplained: 0,
  };

  for (const receipt of detached) {
    const attribution: Attribution = hand.ids.has(receipt.id)
      ? "issued-by-hand"
      : hand.numbers.has(normalise(receipt.number))
        ? "issued-by-hand"
        : deleted.has(normalise(receipt.payerName))
          ? "person-deleted"
          : "unexplained";
    tally[attribution] += 1;
    console.log(
      `${receipt.number}  ${attribution}  ${receipt.createdAt.toISOString().slice(0, 10)}  ${receipt.reason}`,
    );
  }

  console.log("");
  console.log(`Active receipts with no payment: ${detached.length}`);
  console.log(`Issued by hand: ${tally["issued-by-hand"]}`);
  console.log(`Left behind by a deleted person: ${tally["person-deleted"]}`);
  console.log(`Unexplained: ${tally.unexplained}`);
  console.log("");
  console.log("Attribution is a heuristic, not a proof.");
  console.log("An ISSUE_RECEIPT audit row naming the receipt means it was issued by hand.");
  console.log("Otherwise a deleted person carrying the same name means the person went.");
  console.log("Neither match leaves the row unexplained.");
  console.log("Dry run only. This script never writes.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
