"use client";

import { useState } from "react";
import { downloadCsv } from "@/lib/csv";
import { passwordsCsv, withPasswords } from "@/lib/memberImportPasswords";
import { memberImportDialog } from "@/lib/texts";
import type { ImportedRow } from "@/lib/memberImportRun";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

export interface ImportOutcome {
  results: ImportedRow[];
  summary: { created: number; updated: number; failed: number };
}

export default function MemberImportResult({
  outcome,
  onImportAnother,
  onDone,
}: {
  outcome: ImportOutcome;
  onImportAnother: () => void;
  onDone: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const passwords = withPasswords(outcome.results);
  const failed = outcome.results.filter((row) => row.outcome === "failed");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs font-bold">
        <span className="badge badge-active">
          {memberImportDialog.resultCreated(outcome.summary.created)}
        </span>
        {outcome.summary.updated > 0 && (
          <span className="badge badge-pending">
            {memberImportDialog.resultUpdated(outcome.summary.updated)}
          </span>
        )}
        {outcome.summary.failed > 0 && (
          <span className="badge badge-rejected">
            {memberImportDialog.resultFailed(outcome.summary.failed)}
          </span>
        )}
      </div>

      {passwords.length > 0 && (
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ background: "#fef3c7", border: "1px solid #fcd34d" }}
        >
          <p className="text-sm font-bold" style={{ color: "#92400e" }}>
            <IconLabel name="lock">{memberImportDialog.passwordsTitle}</IconLabel>
          </p>
          <p className="text-xs font-semibold" style={{ color: "#92400e" }}>
            {memberImportDialog.passwordsOnce}
          </p>
          <button
            type="button"
            onClick={() => {
              downloadCsv(memberImportDialog.passwordsFileName, passwordsCsv(outcome.results));
              setSaved(true);
            }}
            className="btn btn-primary text-sm"
          >
            <IconLabel name="download">
              {saved ? memberImportDialog.passwordsSaved : memberImportDialog.passwordsDownload}
            </IconLabel>
          </button>
        </div>
      )}

      {failed.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--mint-200)" }}>
          <p
            className="px-3 py-2 text-xs font-bold"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            {memberImportDialog.failedTitle}
          </p>
          <ul>
            {failed.map((row) => (
              <li
                key={row.row}
                className="px-3 py-2 text-xs flex items-start gap-2"
                style={{ borderTop: "1px solid var(--mint-100)" }}
              >
                <Icon name="warning" size={14} />
                <span>
                  <span className="font-bold">
                    {row.row} · {row.fullName}
                  </span>
                  <span className="block" style={{ color: "#991b1b" }}>
                    {row.error}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="btn btn-primary text-sm flex-1">
          {memberImportDialog.done}
        </button>
        <button
          type="button"
          onClick={onImportAnother}
          className="btn text-sm"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          {memberImportDialog.importAnother}
        </button>
      </div>
    </div>
  );
}
