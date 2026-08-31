"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { PAYMENT_METHODS } from "@/lib/donations";
import { HOME_VILLAGE, villageChoices } from "@/lib/villages";
import { memberImportDialog } from "@/lib/texts";
import type { CheckContext, CheckedRow } from "@/lib/memberImportCheck";
import type { RowValues } from "@/lib/memberImportValues";
import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import MemberImportUpload from "./MemberImportUpload";
import MemberImportReview from "./MemberImportReview";
import MemberImportResult, { type ImportOutcome } from "./MemberImportResult";
import {
  clearSelection,
  editRow,
  editableRows,
  fillAgeGroup,
  selectMissingAgeGroup,
  selectRow,
  toggleSkip,
  type EditableRow,
} from "./memberImportState";
import type { AgeGroup } from "./types";

export interface ImportPreview {
  batchId: string;
  fileHash: string;
  fileName: string;
  rows: CheckedRow[];
  unknownColumns: string[];
  villages: string[];
  ageGroups: string[];
  membershipFee: number;
  paymentMethods: string[];
  previousImport: { createdAt: string; createdBy: string } | null;
}

export interface ImportRequest {
  batchId: string;
  fileHash: string;
  fileName: string;
  rows: { row: number; values: RowValues; personId: string | null }[];
}

type Props = {
  ageGroups: AgeGroup[];
  onImported: () => Promise<void> | void;
  onClose: () => void;
};

function noticeOf(preview: ImportPreview): string {
  const parts: string[] = [];
  if (preview.previousImport) {
    parts.push(
      memberImportDialog.alreadyImported(
        new Date(preview.previousImport.createdAt).toLocaleDateString("ar"),
        preview.previousImport.createdBy,
      ),
    );
  }
  if (preview.unknownColumns.length) {
    parts.push(
      memberImportDialog.unknownColumns(
        preview.unknownColumns.join(memberImportDialog.listSeparator),
      ),
    );
  }
  return parts.join(memberImportDialog.noticeSeparator);
}

export default function MemberImportDialog({ ageGroups, onImported, onClose }: Props) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const context: CheckContext = {
    villageNames: preview?.villages ?? villageChoices([]),
    ageGroupNames: preview?.ageGroups ?? ageGroups.map((group) => group.name),
    membershipFee: preview?.membershipFee ?? 0,
    paymentMethods: preview?.paymentMethods ?? PAYMENT_METHODS,
  };

  async function pick(file: File) {
    setError("");
    if (!/\.csv$/i.test(file.name)) {
      setError(memberImportDialog.fileNotCsv);
      return;
    }
    setLoading(true);
    try {
      const content = await file.text();
      const data = await api.post<ImportPreview>("/api/admin/people/import/preview", {
        fileName: file.name,
        content,
      });
      setPreview(data);
      setRows(editableRows(data.rows));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!preview) return;
    setError("");
    setLoading(true);
    try {
      const request: ImportRequest = {
        batchId: preview.batchId,
        fileHash: preview.fileHash,
        fileName: preview.fileName,
        rows: rows
          .filter((row) => !row.skip)
          .map((row) => ({
            row: row.row,
            values: row.values,
            personId: row.match?.kind === "phone" ? row.match.personId : null,
          })),
      };
      setOutcome(await api.post<ImportOutcome>("/api/admin/people/import", request));
      await onImported();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function back() {
    setPreview(null);
    setOutcome(null);
    setRows([]);
    setError("");
  }

  const step = outcome
    ? memberImportDialog.resultStep
    : preview
      ? memberImportDialog.reviewStep
      : memberImportDialog.uploadStep;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-5xl rounded-t-3xl md:rounded-2xl overflow-y-auto"
        style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
      >
        <DialogHeader
          title={<IconLabel name="upload">{`${memberImportDialog.title} — ${step}`}</IconLabel>}
          onClose={onClose}
        />

        <div className="p-4">
          {outcome ? (
            <MemberImportResult outcome={outcome} onImportAnother={back} onDone={onClose} />
          ) : preview ? (
            <MemberImportReview
              rows={rows}
              villages={preview.villages}
              ageGroups={preview.ageGroups}
              paymentMethods={preview.paymentMethods}
              notice={noticeOf(preview)}
              error={error}
              loading={loading}
              onEdit={(row, change) => setRows((all) => editRow(all, row, change, context))}
              onSkip={(row) => setRows((all) => toggleSkip(all, row, context))}
              onSelect={(row, value) => setRows((all) => selectRow(all, row, value))}
              onSelectMissing={() => setRows(selectMissingAgeGroup)}
              onClear={() => setRows(clearSelection)}
              onFillAgeGroup={(age) => setRows((all) => fillAgeGroup(all, age, context))}
              onBack={back}
              onImport={send}
            />
          ) : (
            <MemberImportUpload
              ageGroup={ageGroups[0]?.name ?? HOME_VILLAGE}
              error={error}
              loading={loading}
              onPick={pick}
            />
          )}
        </div>
      </div>
    </div>
  );
}
