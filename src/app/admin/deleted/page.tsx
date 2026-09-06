"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import PageLoading from "@/components/PageLoading";
import AdminToolHeader from "@/components/admin/AdminToolHeader";
import IconLabel from "@/components/IconLabel";
import { auditTargetLabel } from "@/lib/auditFields";
import { countedNoun, DAYS } from "@/lib/arabicPlural";
import { deletedRecords } from "@/lib/texts";

interface DeletedRow {
  id: string;
  kind: string;
  label: string;
  deletedBy: string;
  deletedAt: string;
  daysLeft: number;
}

function Row({ row, onRestored }: { row: DeletedRow; onRestored: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);

  async function restore() {
    setBusy(true);
    try {
      await api.post(`/api/admin/deleted/${row.id}/restore`, {});
      await onRestored();
    } catch (e) {
      alert(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="card p-3 flex items-center gap-2 flex-wrap">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate">{row.label}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {deletedRecords.note(
            auditTargetLabel(row.kind),
            row.deletedBy,
            countedNoun(row.daysLeft, DAYS),
          )}
        </p>
      </div>
      <button
        onClick={restore}
        disabled={busy}
        className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        {busy ? "..." : <IconLabel name="refresh">{deletedRecords.restore}</IconLabel>}
      </button>
    </div>
  );
}

export default function DeletedRecordsPage() {
  const [records, setRecords] = useState<DeletedRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    return api
      .get<{ records: DeletedRow[] }>("/api/admin/deleted")
      .then((data) => {
        setRecords(data.records || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="admin-page space-y-3">
      <AdminToolHeader href="/admin/deleted" />

      {loading ? (
        <PageLoading />
      ) : records.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
          {deletedRecords.empty}
        </p>
      ) : (
        <div className="space-y-2">
          {records.map((row) => (
            <Row key={row.id} row={row} onRestored={load} />
          ))}
        </div>
      )}
    </div>
  );
}
