"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import ElectionList from "./ElectionList";
import ElectionPanel from "./ElectionPanel";
import type { ElectionRow } from "./electionTypes";

export default function AdminElectionsPage() {
  const [rows, setRows] = useState<ElectionRow[]>([]);
  const [electorate, setElectorate] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .get<{ elections: ElectionRow[]; electorate: number }>("/api/admin/elections")
      .then((data) => {
        if (!alive) return;
        setRows(data.elections);
        setElectorate(data.electorate);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [reload]);

  const refresh = useCallback(() => setReload((n) => n + 1), []);

  const selected = creating ? null : (rows.find((row) => row.id === selectedId) ?? null);
  const open = creating || selected !== null;

  return (
    <div className="admin-page space-y-5">
      <ElectionList
        rows={rows}
        selectedId={creating ? null : selectedId}
        onSelect={(id) => {
          setCreating(false);
          setSelectedId(id);
        }}
        onCreate={() => {
          setCreating(true);
          setSelectedId(null);
        }}
      />

      {open && (
        <ElectionPanel
          key={selected?.id ?? "new"}
          election={selected}
          electorate={electorate}
          onSaved={(id) => {
            setCreating(false);
            setSelectedId(id);
          }}
          onChanged={refresh}
          onDeleted={() => {
            setCreating(false);
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
}
