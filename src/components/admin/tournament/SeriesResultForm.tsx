"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import { seriesResult as texts } from "@/lib/texts";
import PartEditor, { EMPTY_DRAFT, bodyOf, draftOf, type PartDraft } from "./PartEditor";
import PartLine, { PartsEmpty } from "./PartRow";
import SeriesStanding from "./SeriesStanding";
import type { SeriesConfig } from "./seriesConfig";
import MatchAdjustments from "./MatchAdjustments";
import type { AdjustmentRuleRow, SeriesState } from "./seriesTypes";

export default function SeriesResultForm({
  matchId,
  activityId,
  config,
  sides,
  onSaved,
}: {
  matchId: string;
  activityId: string;
  config: SeriesConfig;
  sides: string[];
  onSaved: () => void;
}) {
  const [state, setState] = useState<SeriesState | null>(null);
  const [rules, setRules] = useState<AdjustmentRuleRow[]>([]);
  const [draft, setDraft] = useState<PartDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const base = `/api/admin/matches/${matchId}/parts`;

  const load = useCallback(async () => {
    try {
      const [next, declared] = await Promise.all([
        api.get<SeriesState>(base),
        api.get<{ rules: AdjustmentRuleRow[] }>(
          `/api/admin/activities/${activityId}/adjustment-rules`,
        ),
      ]);
      setState(next);
      setRules(declared.rules);
    } catch {
      setError(texts.loadFailed);
    }
  }, [base, activityId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function run(work: () => Promise<SeriesState | { standing: SeriesState["standing"] }>) {
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
  }

  function submit() {
    const body = bodyOf(draft, config);
    return run(async () => {
      const answer = editingId
        ? await api.patch<SeriesState>(`${base}/${editingId}`, body)
        : await api.post<SeriesState>(base, body);
      setDraft(EMPTY_DRAFT);
      setEditingId(null);
      return answer;
    });
  }

  if (!state) {
    return (
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        {error || "..."}
      </p>
    );
  }

  const open = !state.standing.over;

  return (
    <div
      className="mt-3 pt-3 space-y-3"
      style={{ borderTop: "1px solid var(--mint-100)" }}
      data-testid="series-result-form"
    >
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="list">{texts.heading(config.partsWord)}</IconLabel>
      </p>

      <SeriesStanding standing={state.standing} config={config} sides={sides} />

      {state.parts.length === 0 ? (
        <PartsEmpty config={config} />
      ) : (
        <div className="space-y-1.5">
          {state.parts.map((part) => (
            <PartLine
              key={part.id}
              part={part}
              config={config}
              sides={sides}
              busy={busy}
              editable={open}
              onEdit={() => {
                setEditingId(part.id);
                setDraft(draftOf(part));
              }}
              onRemove={() => run(() => api.del<SeriesState>(`${base}/${part.id}`))}
            />
          ))}
        </div>
      )}

      <MatchAdjustments
        rules={rules}
        recorded={state.adjustments}
        sides={sides}
        partWord={config.partWord}
        busy={busy}
        open={open}
        onRecord={(ruleId, side) =>
          run(() =>
            api.post<SeriesState>(`/api/admin/matches/${matchId}/adjustments`, { ruleId, side }),
          )
        }
        onUndo={(id) =>
          run(() => api.del<SeriesState>(`/api/admin/matches/${matchId}/adjustments/${id}`))
        }
      />

      {open && (
        <PartEditor
          draft={draft}
          config={config}
          sides={sides}
          busy={busy}
          editing={editingId !== null}
          onChange={setDraft}
          onSubmit={submit}
          onCancel={() => {
            setEditingId(null);
            setDraft(EMPTY_DRAFT);
          }}
        />
      )}

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
