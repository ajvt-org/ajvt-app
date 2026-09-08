"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Disclosure from "@/components/admin/Disclosure";
import { useToast } from "@/components/Toast";
import { matchLevelsSetup as texts } from "@/lib/texts";
import { readBackOf } from "@/lib/levelReadBack";
import type { LevelRow } from "@/lib/matchLevels";
import type { MoveRuleRow } from "./seriesTypes";
import LevelFields from "./LevelFields";
import LevelMoves from "./LevelMoves";
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

export function configurationHolds(drafts: LevelDraft[], moves: MoveDraft[]): boolean {
  if (drafts.length === 0) return false;
  const ladder = ladderOfDrafts(drafts);
  if (levelFixes(ladder, drafts).some((fix) => fix !== null)) return false;
  return moveFixes(
    moves,
    drafts.map((draft) => draft.key),
  ).every((problem) => problem === null);
}

export default function MatchLevelsCard({ activityId }: { activityId: string }) {
  const showToast = useToast();
  const [drafts, setDrafts] = useState<LevelDraft[] | null>(null);
  const [moves, setMoves] = useState<MoveDraft[]>([]);
  const [played, setPlayed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const base = `/api/admin/activities/${activityId}`;

  const load = useCallback(async () => {
    try {
      const saved = await api.get<{ levels: LevelRow[]; moves: MoveRuleRow[]; played: string[] }>(
        `${base}/levels`,
      );
      setPlayed(saved.played ?? []);
      setDrafts(saved.levels.map(draftOfLevel));
      setMoves((saved.moves ?? []).map(draftOfMove));
    } catch {
      setError(texts.loadFailed);
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
  const holds = configurationHolds(drafts, moves);
  const locked = (draft: LevelDraft) => draft.id !== null && played.includes(draft.id);

  const patch = (index: number, next: Partial<LevelDraft>) =>
    setDrafts(drafts.map((draft, at) => (at === index ? { ...draft, ...next } : draft)));

  const dropLevel = (index: number) => {
    const gone = drafts[index].key;
    setDrafts(drafts.filter((_, at) => at !== index));
    setMoves(moves.filter((move) => move.levelKey !== gone));
  };

  async function save() {
    setBusy(true);
    setError("");
    try {
      await api.put(`${base}/levels`, {
        levels: levelPayload(drafts!),
        moves: moves.map(movePayload),
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

      {drafts.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.none}
        </p>
      )}

      <div className="space-y-3">
        {drafts.map((draft, index) => {
          const below = drafts[index + 1] ?? null;
          const own =
            draft.singular.trim() ||
            (index === 0 ? texts.matchLevel : texts.levelNumber(index + 1));
          const under = below
            ? {
                singular: below.singular.trim() || texts.singular,
                plural: below.plural.trim() || texts.plural,
              }
            : null;
          const here = moves.filter((move) => move.levelKey === draft.key);
          return (
            <div
              key={draft.key}
              className="rounded-lg p-2.5 space-y-2"
              style={{ border: "1px solid var(--mint-100)" }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="min-w-0 flex-1 text-xs font-bold"
                  style={{ color: "var(--mint-700)" }}
                >
                  <bdi>{own}</bdi>
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
                  onClick={() => dropLevel(index)}
                  disabled={busy || locked(draft)}
                  className="btn btn-icon btn-sm"
                  style={{ color: "#991b1b" }}
                >
                  <Icon name="trash" size={13} />
                </button>
              </div>

              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                <bdi>{readBackOf(ladder[index], under)}</bdi>
              </p>

              <LevelFields
                draft={draft}
                own={own}
                under={under}
                last={index === drafts.length - 1}
                disabled={busy}
                locked={locked(draft)}
                fix={fixes[index]}
                onChange={(next) => patch(index, next)}
              />

              {index > 0 && (
                <Disclosure
                  title={<span className="text-xs">{texts.moves(own)}</span>}
                  color="var(--mint-700)"
                  className="rounded-lg px-2.5 py-2"
                  surface={{ background: "var(--surface-2)" }}
                >
                  <LevelMoves
                    moves={here}
                    faults={here.map((move) => faults[moves.indexOf(move)])}
                    under={own}
                    disabled={busy || locked(draft)}
                    onChange={(key, next) =>
                      setMoves(
                        moves.map((move) => (move.key === key ? { ...move, ...next } : move)),
                      )
                    }
                    onAdd={() =>
                      setMoves([
                        ...moves,
                        blankMove(`new-${moves.length}-${Date.now()}`, draft.key),
                      ])
                    }
                    onRemove={(key) => setMoves(moves.filter((move) => move.key !== key))}
                  />
                </Disclosure>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setDrafts([...drafts, blankDraft(`new-${drafts.length}-${Date.now()}`)])}
          disabled={busy}
          className="btn btn-sm"
        >
          <IconLabel name="plus">{texts.addLevel}</IconLabel>
        </button>
        <button onClick={save} disabled={busy || !holds} className="btn btn-primary btn-sm">
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
