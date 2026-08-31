import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { logAction, auditContext } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { PAYMENT_METHODS } from "@/lib/donations";
import { getAppSettings } from "@/lib/settingsServer";
import { villageNames } from "@/lib/villagesServer";
import { claimImportBatch } from "@/lib/importBatchServer";
import { checkValues, matchesFor } from "@/lib/memberImportCheck";
import { importContext } from "@/lib/memberImportServer";
import {
  createFromRow,
  credentialFor,
  updateFromRow,
  type ImportedRow,
} from "@/lib/memberImportRun";
import { memberImportRun } from "@/lib/messages";
import { importRunSchema, type ImportRun } from "./schema";

function tally(results: ImportedRow[]) {
  return {
    created: results.filter((row) => row.outcome === "created").length,
    updated: results.filter((row) => row.outcome === "updated").length,
    skipped: results.filter((row) => row.outcome === "skipped").length,
    failed: results.filter((row) => row.outcome === "failed").length,
  };
}

function failureOf(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === "P2002") return memberImportRun.phoneTaken;
  if (code === "P2025") return memberImportRun.accountGone;
  return memberImportRun.rowFailed;
}

export const POST = withRoute("POST /api/admin/people/import", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const run: ImportRun = parse(importRunSchema, await req.json());

  if (run.rows.length === 0) {
    return NextResponse.json({ error: memberImportRun.nothingToImport }, { status: 400 });
  }

  const { membershipFee, membershipYear } = await getAppSettings();
  const names = await villageNames();
  const { people, ageGroupNames } = await importContext();

  const valued = run.rows.map((row) => ({ row: row.row, values: row.values }));
  const matches = matchesFor(valued, people);
  const issues = checkValues(
    valued.map((row, at) => ({ ...row, match: matches[at] })),
    {
      villageNames: names,
      ageGroupNames,
      membershipFee,
      paymentMethods: PAYMENT_METHODS,
    },
  );

  const claimed = await claimImportBatch({
    id: run.batchId,
    fileHash: run.fileHash,
    fileName: run.fileName,
    rowCount: run.rows.length,
    createdBy: session.username,
  });
  if (!claimed) {
    return NextResponse.json({ error: memberImportRun.batchAlreadyRan }, { status: 409 });
  }

  const settings = { membershipFee, membershipYear, recordedBy: session.username };
  const results: ImportedRow[] = [];

  for (const [at, row] of run.rows.entries()) {
    const { values } = row;
    const base = {
      row: row.row,
      fullName: values.fullName,
      phone: values.phone,
      paid: values.paid,
    };

    const blocking = issues[at].find((issue) => issue.blocking);
    if (blocking) {
      results.push({ ...base, outcome: "failed", error: blocking.message });
      continue;
    }

    const personId = row.personId ?? (matches[at]?.kind === "phone" ? matches[at].personId : null);

    try {
      if (personId) {
        await prisma.$transaction((tx) => updateFromRow(tx, personId, values, settings));
        results.push({ ...base, outcome: "updated", personId });
        continue;
      }

      const credential = await credentialFor(values.phone);
      const created = await prisma.$transaction((tx) =>
        createFromRow(tx, values, credential, settings),
      );
      results.push({ ...base, outcome: "created", ...created });
    } catch (error) {
      logger.error("import row failed", { batchId: run.batchId, row: row.row, error });
      results.push({ ...base, outcome: "failed", error: failureOf(error) });
    }
  }

  const summary = tally(results);

  for (const result of results) {
    if (result.outcome === "failed") continue;
    await logAction(
      session.username,
      result.outcome === "created" ? "CREATE_PERSON" : "UPDATE_PERSON",
      result.fullName,
      {
        ...auditContext(session, req),
        targetType: "User",
        targetId: result.personId,
        meta: { batchId: run.batchId, row: result.row },
      },
    );
    if (result.paid) {
      await logAction(session.username, "ADD_MEMBERSHIP", result.fullName, {
        ...auditContext(session, req),
        targetType: "Member",
        targetId: result.personId,
        after: { status: "ACTIVE", year: membershipYear },
        meta: { batchId: run.batchId, row: result.row },
      });
    }
  }

  await logAction(session.username, "IMPORT_PEOPLE", run.fileName, {
    ...auditContext(session, req),
    targetType: "ImportBatch",
    targetId: run.batchId,
    after: summary,
  });

  return NextResponse.json({ batchId: run.batchId, results, summary }, { status: 201 });
});
