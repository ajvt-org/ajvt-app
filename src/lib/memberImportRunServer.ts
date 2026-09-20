import { prisma } from "./prisma";
import { ConflictError, ValidationError } from "./errors";
import { logger } from "./logger";
import { memberImportRun as messages } from "./messages";
import { adminRecorder } from "./membershipRecorder";
import { offeredMethodNames } from "./paymentMethodsServer";
import { getAppSettings } from "./settingsServer";
import { villageNames } from "./villagesServer";
import { claimImportBatch } from "./importBatchServer";
import { checkValues, matchesFor } from "./memberImportCheck";
import { importContext } from "./memberImportServer";
import { createFromRow, credentialFor, updateFromRow, type ImportedRow } from "./memberImportRun";
import type { RowValues } from "./memberImportValues";

export interface ImportRequest {
  batchId: string;
  fileHash: string;
  fileName: string;
  rows: { row: number; personId?: string | null; values: RowValues }[];
}

interface Recorder {
  username: string;
  adminId: string;
}

function tally(results: ImportedRow[]) {
  return {
    created: results.filter((row) => row.outcome === "created").length,
    updated: results.filter((row) => row.outcome === "updated").length,
    failed: results.filter((row) => row.outcome === "failed").length,
    memberships: results.filter((row) => row.membership).length,
  };
}

function failureOf(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === "P2002") return messages.phoneTaken;
  if (code === "P2025") return messages.accountGone;
  return messages.rowFailed;
}

export async function runMemberImport(run: ImportRequest, session: Recorder) {
  if (run.rows.length === 0) throw new ValidationError(messages.nothingToImport);

  const { membershipFee, membershipYear } = await getAppSettings();
  const names = await villageNames();
  const paymentMethods = await offeredMethodNames();
  const { people, ageGroupNames } = await importContext(membershipYear);

  const valued = run.rows.map((row) => ({ row: row.row, values: row.values }));
  const matches = matchesFor(valued, people);
  const issues = checkValues(
    valued.map((row, at) => ({ ...row, match: matches[at] })),
    { villageNames: names, ageGroupNames, membershipFee, paymentMethods },
  );

  const claimed = await claimImportBatch({
    id: run.batchId,
    fileHash: run.fileHash,
    fileName: run.fileName,
    rowCount: run.rows.length,
    createdBy: session.username,
  });
  if (!claimed) throw new ConflictError(messages.batchAlreadyRan);

  const settings = { membershipFee, membershipYear, recorder: adminRecorder(session) };
  const results: ImportedRow[] = [];

  for (const [at, row] of run.rows.entries()) {
    const { values } = row;
    const base = { row: row.row, fullName: values.fullName, phone: values.phone };

    const blocking = issues[at].find((issue) => issue.blocking);
    if (blocking) {
      results.push({ ...base, outcome: "failed", membership: false, error: blocking.message });
      continue;
    }

    const match = matches[at];
    const personId = match?.kind === "phone" ? match.personId : null;

    if ((row.personId ?? null) !== personId) {
      results.push({ ...base, outcome: "failed", membership: false, error: messages.matchChanged });
      continue;
    }

    try {
      if (personId) {
        const updated = await prisma.$transaction((tx) =>
          updateFromRow(tx, personId, values, settings),
        );
        results.push({ ...base, outcome: "updated", personId, ...updated });
        continue;
      }

      const credential = await credentialFor(values.phone);
      const created = await prisma.$transaction((tx) =>
        createFromRow(tx, values, credential, settings),
      );
      results.push({ ...base, outcome: "created", ...created });
    } catch (error) {
      logger.error("import row failed", { batchId: run.batchId, row: row.row, error });
      results.push({ ...base, outcome: "failed", membership: false, error: failureOf(error) });
    }
  }

  return { results, summary: tally(results), membershipYear };
}
