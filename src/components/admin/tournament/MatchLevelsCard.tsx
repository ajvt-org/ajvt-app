"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { refusalMessage } from "@/lib/apiFailure";
import IconLabel from "@/components/IconLabel";
import { useToast } from "@/components/Toast";
import { matchLevelsSetup as texts } from "@/lib/texts";
import { tournament as messages } from "@/lib/messages";
import type { ConfigurationLock } from "@/lib/configurationLock";
import type { LevelRow } from "@/lib/matchLevels";
import type { MoveRuleRow } from "./seriesTypes";
import LevelCard from "./LevelCard";
import { levelFixes, moveFixes } from "./levelFaults";
import {
  blankDraft,
  draftOfLevel,
  ladderOfDrafts,
  levelPayload,
  movedDraft,
  type LevelDraft,
} from "./levelDraft";
import { blankMove, draftOfMove, movePayload, type MoveDraft } from "./moveDraft";
import {
  blankWorth,
  draftOfWorth,
  worthFaults,
  worthPayload,
  type WorthDraft,
  type WorthRuleRow,
} from "./worthDraft";

export function configurationHolds(
  drafts: LevelDraft[],
  moves: MoveDraft[],
  worth: WorthDraft[] = [],
): boolean {
  if (drafts.length === 0) return false;
  const ladder = ladderOfDrafts(drafts);
  if (levelFixes(ladder, drafts).some((fix) => fix !== null)) return false;
  const keys = drafts.map((draft) => draft.key);
  if (worthFaults(worth, keys).some((problem) => problem !== null)) return false;
  return moveFixes(moves, keys).every((problem) => problem === null);
}

function nameOf(draft: LevelDraft, index: number): string {
  return draft.singular.trim() || (index === 0 ? texts.matchLevel : texts.levelNumber(index + 1));
}

export default function MatchLevelsCard({ activityId }: { activityId: string }) {
  const showToast = useToast();
  const [drafts, setDrafts] = useState<LevelDraft[] | null>(null);
  const [moves, setMoves] = useState<MoveDraft[]>([]);
  const [worth, setWorth] = useState<WorthDraft[]>([]);
  const [lock, setLock] = useState<ConfigurationLock | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const base = `/api/admin/activities/${activityId}`;

  const load = useCallback(async () => {
    try {
      const saved = await api.get<{
        levels: LevelRow[];
        moves: MoveRuleRow[];
        worthRules: WorthRuleRow[];
        lock: ConfigurationLock | null;
      }>(`${base}/levels`);
      setLock(saved.lock ?? null);
      setDrafts(saved.levels.map(draftOfLevel));
      setMoves((saved.moves ?? []).map(draftOfMove));
      setWorth((saved.worthRules ?? []).map(draftOfWorth));
    } catch (e) {
      setError(refusalMessage(e, texts.loadFailed));
    }
  }, [base]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (drafts === null) {
    return (
      <div className="card p-4">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {error || "..."}
        </p>
      </div>
    );
  }

  const ladder = ladderOfDrafts(drafts);
  const fixes = levelFixes(ladder, drafts);
  const faults = moveFixes(
    moves,
    drafts.map((draft) => draft.key),
  );
  const worthProblems = worthFaults(
    worth,
    drafts.map((draft) => draft.key),
  );
  const holds = configurationHolds(drafts, moves, worth);
  const frozen = busy || lock !== null;

  const patch = (index: number, next: Partial<LevelDraft>) =>
    setDrafts(drafts.map((draft, at) => (at === index ? { ...draft, ...next } : draft)));

  const dropLevel = (index: number) => {
    const gone = drafts[index].key;
    setDrafts(drafts.filter((_, at) => at !== index));
    setMoves(moves.filter((move) => move.levelKey !== gone));
    setWorth(worth.filter((rule) => rule.levelKey !== gone));
  };

  async function save() {
    setBusy(true);
    setError("");
    try {
      await api.put(`${base}/levels`, {
        levels: levelPayload(drafts!),
        moves: moves.map(movePayload),
        worthRules: worth.map(worthPayload),
      });
      showToast(texts.saved);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="list">{texts.heading}</IconLabel>
      </p>

      {lock && (
        <p className="text-xs font-semibold" style={{ color: "var(--copper-600)" }}>
          <IconLabel name="lock">{messages.configurationLocked[lock]}</IconLabel>
        </p>
      )}

      {drafts.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.none}
        </p>
      )}

      <div className="space-y-3">
        {drafts.map((draft, index) => {
          const here = moves.filter((move) => move.levelKey === draft.key);
          const worthHere = worth.find((rule) => rule.levelKey === draft.key) ?? null;
          return (
            <LevelCard
              key={draft.key}
              draft={draft}
              own={nameOf(draft, index)}
              index={index}
              count={drafts.length}
              frozen={frozen}
              fix={fixes[index]}
              moves={{
                drafts: here,
                faults: here.map((move) => faults[moves.indexOf(move)]),
                onChange: (key, next) =>
                  setMoves(moves.map((move) => (move.key === key ? { ...move, ...next } : move))),
                onAdd: () =>
                  setMoves([...moves, blankMove(`new-${moves.length}-${Date.now()}`, draft.key)]),
                onRemove: (key) => setMoves(moves.filter((move) => move.key !== key)),
              }}
              worth={{
                draft: worthHere,
                fault: worthHere ? worthProblems[worth.indexOf(worthHere)] : null,
                onChange: (next) =>
                  setWorth(
                    worth.map((rule) =>
                      rule.key === worthHere?.key ? { ...rule, ...next } : rule,
                    ),
                  ),
                onDeclare: () =>
                  setWorth([...worth, blankWorth(`new-${worth.length}-${Date.now()}`, draft.key)]),
                onRemove: () => setWorth(worth.filter((rule) => rule.key !== worthHere?.key)),
              }}
              onChange={(next) => patch(index, next)}
              onMove={(to) => setDrafts(movedDraft(drafts, index, to))}
              onRemove={() => dropLevel(index)}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setDrafts([...drafts, blankDraft(`new-${drafts.length}-${Date.now()}`)])}
          disabled={frozen}
          className="btn btn-sm"
        >
          <IconLabel name="plus">{texts.addLevel}</IconLabel>
        </button>
        <button onClick={save} disabled={frozen || !holds} className="btn btn-primary btn-sm">
          <IconLabel name="save">{texts.save}</IconLabel>
        </button>
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
