"use client";

import { downloadCsv } from "@/lib/csv";
import { TEMPLATE_FILE_NAME, templateCsv } from "@/lib/memberImportTemplate";
import { memberImportDialog } from "@/lib/texts";
import IconLabel from "@/components/IconLabel";
import Icon from "@/components/Icon";

export default function MemberImportUpload({
  ageGroup,
  error,
  loading,
  onPick,
}: {
  ageGroup: string;
  error: string;
  loading: boolean;
  onPick: (file: File) => void;
}) {
  return (
    <div className="space-y-3">
      <label
        className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl cursor-pointer text-center"
        style={{ background: "var(--mint-100)", border: "1px dashed var(--mint-300)" }}
      >
        <Icon name="upload" />
        <span className="text-sm font-bold" style={{ color: "var(--mint-700)" }}>
          {loading ? memberImportDialog.reading : memberImportDialog.pickFile}
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onPick(file);
          }}
        />
      </label>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => downloadCsv(TEMPLATE_FILE_NAME, templateCsv(ageGroup))}
          className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          <IconLabel name="download">{memberImportDialog.downloadTemplate}</IconLabel>
        </button>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {memberImportDialog.templateNote}
        </p>
      </div>

      {error && (
        <div
          className="p-3 rounded-xl text-sm font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <IconLabel name="warning">{error}</IconLabel>
        </div>
      )}
    </div>
  );
}
