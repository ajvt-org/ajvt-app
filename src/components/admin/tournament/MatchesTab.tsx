"use client";

import { useState } from "react";
import type { Group, Match, Team, TournamentFormat } from "./types";
import { matchesState } from "./matchesState";
import type { EntrantKind } from "@/lib/entrant";
import NewMatchForm from "./NewMatchForm";
import { isFootball } from "@/lib/matchShape";
import type { SeriesConfig } from "./seriesConfig";
import BracketPanel from "./BracketPanel";
import MatchListSection from "./MatchListSection";
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

  const common = {
    activityId,
    teams,
    allMatches: matches,
    matchShape,
    series,
    entrant,
    suspendedIds,
    mvpVoteMinutes,
  };

  const panels = {
    resultFormFor,
    mvpFor,
    detailsFor,
    onToggleResultForm: (id: string) => setResultFormFor((v) => (v === id ? null : id)),
    onToggleMvp: (id: string) => setMvpFor((v) => (v === id ? null : id)),
    onToggleDetails: (id: string) => setDetailsFor((v) => (v === id ? null : id)),
    onCloseResultForm: () => setResultFormFor(null),
  };

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

      <button onClick={() => setShowWizard(true)} className="btn btn-ghost text-sm w-full">
        <IconLabel name="sparkle">{wizardTexts.open}</IconLabel>
      </button>

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

      <MatchListSection
        title={texts.upcoming}
        icon="calendar"
        matches={scheduled}
        common={common}
        panels={panels}
        onDelete={deleteMatch}
        onChange={onChange}
        onMove={(index, direction) => moveMatch(scheduled, index, direction)}
      />

      <MatchListSection
        title={texts.results}
        icon="check"
        matches={played}
        common={common}
        panels={panels}
        onDelete={deleteMatch}
        onChange={onChange}
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
