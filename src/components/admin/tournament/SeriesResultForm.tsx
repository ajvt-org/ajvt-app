"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { refusalMessage } from "@/lib/apiFailure";
import IconLabel from "@/components/IconLabel";
import { seriesResult as texts } from "@/lib/texts";
import { recordsOnItself } from "@/lib/matchLevels";
import SeriesStanding from "./SeriesStanding";
import UnitBranch from "./UnitBranch";
import type { SeriesConfig } from "./seriesConfig";
import type { EditorApi } from "./unitEditorApi";
import type { SeriesState } from "./seriesTypes";

export default function SeriesResultForm({
  matchId,
  config,
  sides,
  onSaved,
}: {
  matchId: string;
  config: SeriesConfig;
  sides: string[];
  onSaved: () => void;
}) {
  const [state, setState] = useState<SeriesState | null>(null);
  const [opened, setOpened] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const base = `/api/admin/matches/${matchId}/units`;

  const load = useCallback(async () => {
    try {
      setState(await api.get<SeriesState>(base));
    } catch (e) {
      setError(refusalMessage(e, texts.loadFailed));
    }
  }, [base]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const run = useCallback(
    async (work: () => Promise<unknown>) => {
      setBusy(true);
      setError("");
      try {
        await work();
        await load();
        onSaved();
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [load, onSaved],
  );

  if (!state) {
    return (
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        {error || "..."}
      </p>
    );
  }

  const editor: EditorApi = {
    ladder: state.levels,
    sides,
    busy,
    open: !state.standing.over,
    rules: state.moveRules ?? [],
    worthRules: state.worthRules ?? [],
    moves: state.moves,
    opened,
    onToggle: (unitId) =>
      setOpened(
        opened.includes(unitId) ? opened.filter((id) => id !== unitId) : [...opened, unitId],
      ),
    onAdd: (parentId, body) => run(() => api.post(base, { ...body, parentId })),
    onCorrect: (unitId, body) => run(() => api.patch(`${base}/${unitId}`, body)),
    onRemove: (unitId) => run(() => api.del(`${base}/${unitId}`)),
    onRecordMove: (ruleId, side, unitId) =>
      run(() => api.post(`/api/admin/matches/${matchId}/moves`, { ruleId, side, unitId })),
    onUndoMove: (moveId) => run(() => api.del(`/api/admin/matches/${matchId}/moves/${moveId}`)),
    onKeepWorth: (unitId, kept) => run(() => api.patch(`${base}/${unitId}/worth`, { kept })),
  };

  const own = recordsOnItself(state.levels);

  return (
    <div
      className="mt-3 pt-3 space-y-3"
      style={{ borderTop: "1px solid var(--mint-100)" }}
      data-testid="series-result-form"
    >
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="list">{own ? texts.matchResult : texts.heading}</IconLabel>
      </p>

      {!own && <SeriesStanding standing={state.standing} config={config} sides={sides} />}

      <UnitBranch api={editor} parentId={null} depth={1} units={state.units} full={false} />

      {error && (
        <div
          className="p-2.5 rounded-lg text-xs font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <IconLabel name="warning">{error}</IconLabel>
        </div>
      )}
    </div>
  );
}
