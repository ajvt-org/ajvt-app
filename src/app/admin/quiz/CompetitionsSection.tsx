"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import CompetitionList from "./CompetitionList";
import CompetitionPanel from "./CompetitionPanel";
import ParticipantsPanel from "./ParticipantsPanel";
import RoundsPanel from "./RoundsPanel";
import type { CompetitionRow } from "./competitionTypes";

export default function CompetitionsSection({ questionCount }: { questionCount: number }) {
  const [rows, setRows] = useState<CompetitionRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reload, setReload] = useState(0);

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

      <CompetitionPanel
        key={editing ?? "new"}
        competitionId={editing}
        onSaved={(id) => {
          setCreating(false);
          setSelectedId(id);
        }}
        onChanged={() => setReload((n) => n + 1)}
      />

      {editing && selected?.visibility === "PRIVATE" && (
        <ParticipantsPanel competitionId={editing} locked={selected.startedAt !== null} />
      )}

      {editing && <RoundsPanel competitionId={editing} questionCount={questionCount} />}
    </div>
  );
}
