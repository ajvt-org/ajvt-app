"use client";

import { useState } from "react";
import type { Group, Match, Team, TournamentFormat } from "./types";
import { matchesState } from "./matchesState";
import MatchCard from "./MatchCard";
import type { EntrantKind } from "@/lib/entrant";
import NewMatchForm from "./NewMatchForm";
import { isFootball } from "@/lib/matchShape";
import type { SeriesConfig } from "./seriesConfig";
import BracketPanel from "./BracketPanel";
import BracketSuggestion from "./BracketSuggestion";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import SetupWizard from "./wizard/SetupWizard";
import { matchAdmin as texts, setupWizard as wizardTexts } from "@/lib/texts";

export default function MatchesTab({
  activityId,
  teams,
  groups,
  format,
  matchShape,
  series,
  entrant,
  matches,
  suspendedIds,
  mvpVoteMinutes,
  onChange,
}: {
  activityId: string;
  teams: Team[];
  groups: Group[];
  format: TournamentFormat;
  matchShape: "FOOTBALL" | "SERIES";
  series: SeriesConfig | null;
  entrant: EntrantKind;
  matches: Match[];
  suspendedIds: string[];
  mvpVoteMinutes: number;
  onChange: () => void;
}) {
  const [error, setError] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [resultFormFor, setResultFormFor] = useState<string | null>(null);
  const [mvpFor, setMvpFor] = useState<string | null>(null);
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function runBracketAction(endpoint: string, confirmMsg: string, body?: object) {
    if (!confirm(confirmMsg)) return;
    setGenerating(true);
    setError("");
    try {
      await api.post(`/api/admin/activities/${activityId}/bracket/${endpoint}`, body);
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setGenerating(false);
    }
  }

  const state = matchesState({ format, groups, matches });
  const { groupStageComplete } = state;

  async function moveMatch(list: Match[], index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;
    const a = list[index];
    const b = list[swapIndex];
    try {
      await Promise.all([
        fetch(`/api/admin/matches/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: b.order }),
        }),
        fetch(`/api/admin/matches/${b.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: a.order }),
        }),
      ]);
      onChange();
    } catch {
      alert(texts.reorderFailed);
    }
  }

  async function deleteMatch(matchId: string) {
    if (!confirm(texts.confirmDeleteMatch)) return;
    try {
      await api.del(`/api/admin/matches/${matchId}`);
      onChange();
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  const scheduled = matches.filter((m) => m.status === "SCHEDULED");
  const played = matches.filter((m) => m.status === "PLAYED");

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="p-3 rounded-xl text-sm font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <IconLabel name="warning">{error}</IconLabel>
        </div>
      )}

      <button
        onClick={() => setShowWizard(true)}
        className="btn btn-primary text-sm w-full"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <IconLabel name="sparkle">{wizardTexts.open}</IconLabel>
      </button>

      {groupStageComplete && (
        <div
          className="card p-4 space-y-2"
          style={{ background: "#d1fae5", border: "1px solid #6ee7b7" }}
        >
          <p className="text-sm font-black" style={{ color: "#065f46" }}>
            <IconLabel name="check">{texts.groupStageDoneTitle}</IconLabel>
          </p>
          <p className="text-xs" style={{ color: "#065f46" }}>
            {texts.groupStageDoneHint}
          </p>
          <BracketSuggestion
            activityId={activityId}
            busy={generating}
            onValidate={(redo) => runBracketAction("suggestion", texts.confirmSemis, { redo })}
          />
        </div>
      )}

      {scheduled.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            <IconLabel name="calendar">{texts.upcoming}</IconLabel>
          </p>
          <div className="space-y-3">
            {scheduled.map((m, i) => (
              <MatchCard
                key={m.id}
                match={m}
                teams={teams}
                allMatches={matches}
                activityId={activityId}
                matchShape={matchShape}
                series={series}
                entrant={entrant}
                suspendedIds={suspendedIds}
                mvpVoteMinutes={mvpVoteMinutes}
                onDelete={() => deleteMatch(m.id)}
                showResultForm={resultFormFor === m.id}
                onToggleResultForm={() => setResultFormFor((v) => (v === m.id ? null : m.id))}
                showMvp={mvpFor === m.id}
                onToggleMvp={() => setMvpFor((v) => (v === m.id ? null : m.id))}
                showDetails={detailsFor === m.id}
                onToggleDetails={() => setDetailsFor((v) => (v === m.id ? null : m.id))}
                onMoveUp={i > 0 ? () => moveMatch(scheduled, i, "up") : undefined}
                onMoveDown={
                  i < scheduled.length - 1 ? () => moveMatch(scheduled, i, "down") : undefined
                }
                onSaved={() => {
                  setResultFormFor(null);
                  onChange();
                }}
                onChange={onChange}
              />
            ))}
          </div>
        </div>
      )}

      {played.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            <IconLabel name="check">{texts.results}</IconLabel>
          </p>
          <div className="space-y-3">
            {played.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                teams={teams}
                allMatches={matches}
                activityId={activityId}
                matchShape={matchShape}
                series={series}
                entrant={entrant}
                suspendedIds={suspendedIds}
                mvpVoteMinutes={mvpVoteMinutes}
                onDelete={() => deleteMatch(m.id)}
                showResultForm={resultFormFor === m.id}
                onToggleResultForm={() => setResultFormFor((v) => (v === m.id ? null : m.id))}
                showMvp={mvpFor === m.id}
                onToggleMvp={() => setMvpFor((v) => (v === m.id ? null : m.id))}
                showDetails={detailsFor === m.id}
                onToggleDetails={() => setDetailsFor((v) => (v === m.id ? null : m.id))}
                onSaved={() => {
                  setResultFormFor(null);
                  onChange();
                }}
                onChange={onChange}
              />
            ))}
          </div>
        </div>
      )}

      {teams.length >= 2 && (
        <BracketPanel
          activityId={activityId}
          busy={generating}
          entrant={entrant}
          state={state}
          onAction={runBracketAction}
        />
      )}

      <NewMatchForm
        activityId={activityId}
        teams={teams}
        football={isFootball(matchShape)}
        onCreated={onChange}
      />

      {showWizard && (
        <SetupWizard
          activityId={activityId}
          teams={teams.map((t) => ({ id: t.id, name: t.name }))}
          entrant={entrant}
          playedCount={played.length}
          onDone={onChange}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
