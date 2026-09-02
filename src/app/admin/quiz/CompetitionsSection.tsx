"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import CompetitionList from "./CompetitionList";
import CompetitionWorkspace from "./CompetitionWorkspace";
import type { CompetitionRow } from "./competitionTypes";

export default function CompetitionsSection() {
  const [rows, setRows] = useState<CompetitionRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reload, setReload] = useState(0);
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    let alive = true;
    api
      .get<{ banks: { id: string; name: string }[] }>("/api/admin/quiz/banks")
      .then((data) => {
        if (alive) setBanks(data.banks);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [reload]);

  useEffect(() => {
    let alive = true;
    api
      .get<{ competitions: CompetitionRow[] }>("/api/admin/quiz/competitions")
      .then((data) => {
        if (!alive) return;
        setRows(data.competitions);
        setSelectedId((current) => current ?? data.competitions[0]?.id ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [reload]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const editing = creating ? null : selectedId;
  const open = creating || selectedId !== null;

  return (
    <div className="space-y-5">
      <CompetitionList
        rows={rows}
        selectedId={creating ? null : selectedId}
        onSelect={(id) => {
          setCreating(false);
          setSelectedId(id);
        }}
        onCreate={() => setCreating(true)}
      />

      {open && (
        <CompetitionWorkspace
          key={editing ?? "new"}
          banks={banks}
          competitionId={editing}
          competition={selected}
          onSaved={(id) => {
            setCreating(false);
            setSelectedId(id);
          }}
          onChanged={() => setReload((n) => n + 1)}
          onDeleted={() => {
            setCreating(false);
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
}
