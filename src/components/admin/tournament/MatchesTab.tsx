"use client";

import BracketTree from "@/components/tournament/BracketTree";
import { getMatchWinnerTeamId } from "@/lib/tournament";
import { useState } from "react";
import type { Group, Match, Team, TournamentFormat } from "./types";
import { matchesState } from "./matchesState";
import MatchCard from "./MatchCard";
import BracketSuggestion from "./BracketSuggestion";
import { api, errorMessage } from "@/lib/api";
import ArrowLabel from "@/components/ArrowLabel";
import Icon from "@/components/Icon";
import GenerateScheduleDialog from "./GenerateScheduleDialog";
import IconLabel from "@/components/IconLabel";
import { matchAdmin as texts } from "@/lib/texts";

export default function MatchesTab({
  activityId,
  teams,
  groups,
  format,
  profile,
  matches,
  suspendedIds,
  onChange,
}: {
  activityId: string;
  teams: Team[];
  groups: Group[];
  format: TournamentFormat;
  profile: "FOOTBALL" | "BOARD";
  matches: Match[];
  suspendedIds: string[];
  onChange: () => void;
}) {
  const [form, setForm] = useState({
    homeTeamId: "",
    awayTeamId: "",
    matchDate: "",
    round: "",
    venue: "",
    isKnockout: false,
  });
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
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

  const {
    bracketMatches,
    finalRound,
    bracketIsFinalDone,
    canAdvanceBracket,
    poolsReady,
    knockoutLocked,
    isTwoGroupFormat,
    groupStageComplete,
  } = matchesState({ format, groups, teams, matches });

  async function moveMatch(list: Match[], index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;
    const a = list[index];
    const b = list[swapIndex];
    setLoadingAction(true);
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
    } finally {
      setLoadingAction(false);
    }
  }

  async function createMatch(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!form.homeTeamId || !form.awayTeamId) {
      setError(texts.pickBothTeams);
      return;
    }
    setLoadingAction(true);
    try {
      await api.post(`/api/admin/activities/${activityId}/matches`, form);
      setForm({
        homeTeamId: "",
        awayTeamId: "",
        matchDate: "",
        round: "",
        venue: "",
        isKnockout: false,
      });
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  async function deleteMatch(matchId: string) {
    if (!confirm(texts.confirmDeleteMatch)) return;
    setLoadingAction(true);
    try {
      await api.del(`/api/admin/matches/${matchId}`);
      onChange();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  const homeTeamForForm = teams.find((t) => t.id === form.homeTeamId);
  const awayTeamOptions = teams.filter((t) => {
    if (t.id === form.homeTeamId) return false;
    if (form.isKnockout) return true;
    if (!homeTeamForForm || homeTeamForForm.groupId === null || t.groupId === null) return true;
    return t.groupId === homeTeamForForm.groupId;
  });

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

      {poolsReady && (
        <div
          className="card p-4 space-y-2"
          style={{ background: "#d1fae5", border: "1px solid #6ee7b7" }}
        >
          <p className="text-sm font-black" style={{ color: "#065f46" }}>
            <IconLabel name="check">{texts.poolsReadyTitle}</IconLabel>
          </p>
          <p className="text-xs" style={{ color: "#065f46" }}>
            {texts.poolsReadyHint}
          </p>
          <button
            onClick={() => setShowGenerate(true)}
            disabled={generating}
            className="btn btn-primary text-sm"
            style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
          >
            {generating ? "..." : <IconLabel name="dice">{texts.generateGroupSchedule}</IconLabel>}
          </button>
        </div>
      )}

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
                profile={profile}
                suspendedIds={suspendedIds}
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
                profile={profile}
                suspendedIds={suspendedIds}
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
        <div className="card p-4 space-y-3">
          <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            <IconLabel name="trophy">
              {isTwoGroupFormat ? texts.bracketTwoGroups : texts.bracketKnockout}
            </IconLabel>
          </p>
          {bracketMatches.length === 0 ? (
            knockoutLocked ? (
              <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                <Icon name="lock" size={14} className="icon-inline" /> {texts.knockoutLockedHint}
              </p>
            ) : isTwoGroupFormat ? (
              <BracketSuggestion
                activityId={activityId}
                busy={generating}
                onValidate={(redo) => runBracketAction("suggestion", texts.confirmSemis, { redo })}
              />
            ) : (
              <>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {texts.drawHint}
                </p>
                <button
                  onClick={() => runBracketAction("draw", texts.confirmDraw)}
                  disabled={generating}
                  className="btn btn-primary text-sm"
                  style={{ width: "auto" }}
                >
                  <IconLabel name="dice">{texts.draw}</IconLabel>
                </button>
              </>
            )
          ) : (
            <>
              <BracketTree matches={bracketMatches} />
              {bracketMatches.every((m) => m.bracketRound === 1 && m.status === "SCHEDULED") && (
                <button
                  onClick={() =>
                    isTwoGroupFormat
                      ? runBracketAction("suggestion", texts.confirmRegenerateSemis, {
                          redo: true,
                        })
                      : runBracketAction("draw", texts.confirmRedraw, { redo: true })
                  }
                  disabled={generating}
                  className="btn btn-primary text-sm"
                  style={{ width: "auto" }}
                >
                  <IconLabel name="dice">
                    {isTwoGroupFormat ? texts.regenerateSemis : texts.redraw}
                  </IconLabel>
                </button>
              )}
              {canAdvanceBracket && (
                <button
                  onClick={() => runBracketAction("next-round", texts.confirmNextRound)}
                  disabled={generating}
                  className="btn btn-primary text-sm"
                >
                  <ArrowLabel>{texts.nextRound}</ArrowLabel>
                </button>
              )}
              {bracketIsFinalDone &&
                (() => {
                  const finalMatch = finalRound[0];
                  const winnerId = getMatchWinnerTeamId({
                    ...finalMatch,
                    homeTeamId: finalMatch.homeTeam.id,
                    awayTeamId: finalMatch.awayTeam.id,
                  });
                  const winnerName =
                    winnerId === finalMatch.homeTeam.id
                      ? finalMatch.homeTeam.name
                      : finalMatch.awayTeam.name;
                  return (
                    <p
                      className="text-sm font-black text-center"
                      style={{ color: "var(--mint-700)" }}
                    >
                      <IconLabel name="trophy">
                        {texts.champion} {winnerName}
                      </IconLabel>
                    </p>
                  );
                })()}
            </>
          )}
        </div>
      )}

      {teams.length >= 2 && (
        <button
          onClick={() => setShowGenerate(true)}
          disabled={generating}
          className="btn btn-primary text-sm"
          style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
        >
          {generating ? "..." : <IconLabel name="dice">{texts.suggestSchedule}</IconLabel>}
        </button>
      )}

      <form onSubmit={createMatch} className="card p-4 space-y-3">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="plus">{texts.newMatch}</IconLabel>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.homeTeamId}
            onChange={(e) => setForm((p) => ({ ...p, homeTeamId: e.target.value, awayTeamId: "" }))}
            className="input"
          >
            <option value="">{texts.homeTeamPlaceholder}</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={form.awayTeamId}
            onChange={(e) => setForm((p) => ({ ...p, awayTeamId: e.target.value }))}
            className="input"
          >
            <option value="">{texts.awayTeamPlaceholder}</option>
            {awayTeamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="datetime-local"
            value={form.matchDate}
            onChange={(e) => setForm((p) => ({ ...p, matchDate: e.target.value }))}
            className="input"
          />
          <input
            type="text"
            placeholder={texts.roundPlaceholder}
            value={form.round}
            onChange={(e) => setForm((p) => ({ ...p, round: e.target.value }))}
            maxLength={40}
            className="input"
          />
        </div>
        <input
          type="text"
          placeholder={texts.venuePlaceholder}
          value={form.venue}
          onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
          maxLength={60}
          className="input"
        />
        <label
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: "var(--text-main)" }}
        >
          <input
            type="checkbox"
            checked={form.isKnockout}
            onChange={(e) =>
              setForm((p) => ({ ...p, isKnockout: e.target.checked, awayTeamId: "" }))
            }
          />
          <IconLabel name="trophy">{texts.knockoutFlag}</IconLabel>
        </label>
        <button type="submit" disabled={loadingAction} className="btn btn-primary text-sm">
          {loadingAction ? "..." : texts.addMatch}
        </button>
      </form>

      {showGenerate && (
        <GenerateScheduleDialog
          activityId={activityId}
          onDone={onChange}
          onClose={() => setShowGenerate(false)}
        />
      )}
    </div>
  );
}
