"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { useToast } from "@/components/Toast";
import { matchLevelsSetup as texts } from "@/lib/texts";
import { tournament as messages } from "@/lib/messages";
import { ladderProblem } from "@/lib/seriesSetup";
import type { LevelRow } from "@/lib/matchLevels";
import LevelFields from "./LevelFields";
import MoveRules from "./MoveRules";
import {
  blankDraft,
  draftOfLevel,
  ladderOfDrafts,
  movedDraft,
  type LevelDraft,
} from "./levelDraft";
import type { MoveRuleRow } from "./seriesTypes";

export function ladderFault(drafts: LevelDraft[]): string | null {
  const problem = ladderProblem(ladderOfDrafts(drafts));
  if (problem === null) return null;
  if (typeof problem === "string") return messages.seriesSetup[problem];
  return `${texts.levelNumber(problem.order + 1)} ${messages.seriesSetup[problem.problem]}`;
}

export default function MatchLevelsCard({ activityId }: { activityId: string }) {
  const showToast = useToast();
  const [drafts, setDrafts] = useState<LevelDraft[] | null>(null);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [played, setPlayed] = useState<string[]>([]);
  const [rules, setRules] = useState<MoveRuleRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const base = `/api/admin/activities/${activityId}`;

  const load = useCallback(async () => {
    try {
      const [ladder, declared] = await Promise.all([
        api.get<{ levels: LevelRow[]; played: string[] }>(`${base}/levels`),
        api.get<{ rules: MoveRuleRow[] }>(`${base}/moves`),
      ]);
      setLevels(ladder.levels);
      setPlayed(ladder.played ?? []);
      setDrafts(ladder.levels.map(draftOfLevel));
      setRules(declared.rules);
    } catch {
      setError(texts.loadFailed);
    }
  }, [base]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await work();
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (drafts === null) {
    return (
      <div className="card p-4">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {error || "..."}
        </p>
      </div>
    );
  }

  const fault = ladderFault(drafts);
  const locked = (draft: LevelDraft) => draft.id !== null && played.includes(draft.id);
  const patch = (index: number, next: Partial<LevelDraft>) =>
    setDrafts(drafts.map((draft, at) => (at === index ? { ...draft, ...next } : draft)));

  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="list">{texts.heading}</IconLabel>
      </p>

      {drafts.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.none}
        </p>
      )}

      <div className="space-y-3">
        {drafts.map((draft, index) => (
          <div
            key={draft.key}
            className="rounded-lg p-2.5 space-y-2"
            style={{ border: "1px solid var(--mint-100)" }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold flex-1" style={{ color: "var(--mint-700)" }}>
                {index === 0 ? texts.matchLevel : texts.levelNumber(index + 1)}
              </span>
              <button
                aria-label={texts.moveUp(index + 1)}
                onClick={() => setDrafts(movedDraft(drafts, index, index - 1))}
                disabled={busy || index === 0 || locked(draft)}
                className="btn btn-icon btn-sm"
              >
                <Icon name="chevronUp" size={13} />
              </button>
              <button
                aria-label={texts.moveDown(index + 1)}
                onClick={() => setDrafts(movedDraft(drafts, index, index + 1))}
                disabled={busy || index === drafts.length - 1 || locked(draft)}
                className="btn btn-icon btn-sm"
              >
                <Icon name="chevronDown" size={13} />
              </button>
              <button
                aria-label={texts.removeLevel(index + 1)}
                onClick={() => setDrafts(drafts.filter((_, at) => at !== index))}
                disabled={busy || locked(draft)}
                className="btn btn-icon btn-sm"
                style={{ color: "#991b1b" }}
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
            <LevelFields
              draft={draft}
              first={index === 0}
              last={index === drafts.length - 1}
              disabled={busy}
              locked={locked(draft)}
              onChange={(next) => patch(index, next)}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setDrafts([...drafts, blankDraft(`new-${drafts.length}-${Date.now()}`)])}
          disabled={busy}
          className="btn btn-sm"
        >
          <IconLabel name="plus">{texts.addLevel}</IconLabel>
        </button>
        <button
          onClick={() =>
            run(async () => {
              await api.put(`${base}/levels`, { levels: ladderOfDrafts(drafts) });
              showToast(texts.saved);
            })
          }
          disabled={busy || fault !== null}
          className="btn btn-primary btn-sm"
        >
          <IconLabel name="save">{texts.save}</IconLabel>
        </button>
      </div>

      {fault && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          <IconLabel name="warning">{fault}</IconLabel>
        </p>
      )}

      <div className="pt-3" style={{ borderTop: "1px solid var(--mint-100)" }}>
        <MoveRules
          rules={rules}
          levels={levels}
          busy={busy}
          onDeclare={(move) => run(() => api.post(`${base}/moves`, move))}
          onWithdraw={(ruleId) => run(() => api.del(`${base}/moves/${ruleId}`))}
        />
      </div>

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
