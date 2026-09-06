"use client";

import { useId, useState } from "react";
import type { DecidedMatch, GoalKind, Team } from "./types";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Scoreline from "@/components/tournament/Scoreline";
import GoalSection from "./GoalSection";
import ForfeitToggle from "./ForfeitToggle";
import KickAdder from "./KickAdder";
import type { GoalDraft, KickDraft } from "./goalDraft";
import { forfeitScore } from "@/lib/forfeit";
import {
  extraTimeAllowed,
  hasExtraTime,
  kicksAllowed,
  nextKickTeamId,
  playedScore,
} from "@/lib/matchScores";
import { discipline as disciplineTexts, lists, matchAdmin as texts } from "@/lib/texts";
import { isFootball } from "@/lib/matchShape";

export default function ResultForm({
  match,
  teams,
  matchShape,
  suspendedIds,
  onSaved,
}: {
  match: DecidedMatch;
  teams: Team[];
  matchShape: "FOOTBALL" | "SERIES";
  suspendedIds: string[];
  onSaved: () => void;
}) {
  const uid = useId();
  const football = isFootball(matchShape);
  const banned = new Set(suspendedIds);
  const sides = [match.homeTeam, match.awayTeam];

  const rosterOf = (teamId: string) =>
    (teams.find((t) => t.id === teamId)?.members.map((m) => m.member) || []).filter(
      (m) => !banned.has(m.id),
    );
  const otherTeam = (teamId: string) =>
    teamId === match.homeTeam.id ? match.awayTeam.id : match.homeTeam.id;
  const scorerRoster = (teamId: string, kind: GoalKind) =>
    rosterOf(kind === "OWN_GOAL" ? otherTeam(teamId) : teamId);
  const nameOf = (userId: string | null) => {
    if (userId === null) return texts.unknownScorer;
    for (const t of teams) {
      const hit = t.members.find((m) => m.member.id === userId);
      if (hit) return hit.member.fullName;
    }
    return texts.unknownScorer;
  };
  const suspendedPresent = [match.homeTeam.id, match.awayTeam.id]
    .flatMap((id) => teams.find((t) => t.id === id)?.members.map((m) => m.member) || [])
    .filter((m) => banned.has(m.id));

  const [goals, setGoals] = useState<GoalDraft[]>(
    match.goals.flatMap((g) =>
      Array.from({ length: g.count }, () => ({
        teamId: g.teamId,
        userId: g.member?.id ?? null,
        kind: g.kind,
        period: g.period,
        minute: g.minute != null ? String(g.minute) : "",
      })),
    ),
  );
  const [kicks, setKicks] = useState<KickDraft[]>(
    match.penaltyKicks.map((k) => ({
      teamId: k.teamId,
      userId: k.member?.id ?? null,
      scored: k.scored,
    })),
  );
  const [extraOpen, setExtraOpen] = useState(false);
  const [manOfTheMatchId, setManOfTheMatchId] = useState(match.manOfTheMatch?.id ?? "");
  const [forfeitWinnerTeamId, setForfeitWinnerTeamId] = useState<string | null>(
    match.forfeitWinnerTeamId,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const played = playedScore(goals, match.homeTeam.id);
  const awarded = forfeitWinnerTeamId
    ? forfeitScore(played, forfeitWinnerTeamId, match.homeTeam.id)
    : played;
  const hs = awarded.home;
  const as = awarded.away;

  const extraAllowed = extraTimeAllowed(match.isKnockout, goals, match.homeTeam.id);
  const showExtra = hasExtraTime(goals) || (extraAllowed && extraOpen);
  const extraBlocked = hasExtraTime(goals) && !extraAllowed;

  const kicksOk = kicksAllowed(match.isKnockout, goals, match.homeTeam.id);
  const showKicks = kicks.length > 0 || kicksOk;
  const kicksBlocked = kicks.length > 0 && !kicksOk;
  const stale = extraBlocked || kicksBlocked;

  const kickTally = {
    home: kicks.filter((k) => k.teamId === match.homeTeam.id && k.scored).length,
    away: kicks.filter((k) => k.teamId === match.awayTeam.id && k.scored).length,
  };

  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (stale) {
      setError(extraBlocked ? texts.extraTimeBlocked : texts.shootoutBlocked);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.patch(`/api/admin/matches/${match.id}`, {
        goalEvents: goals.map((g) => ({
          teamId: g.teamId,
          userId: g.userId,
          kind: g.kind,
          period: g.period,
          minute: g.minute || null,
        })),
        penaltyKicks: kicks,
        manOfTheMatchId: manOfTheMatchId || null,
        forfeitWinnerTeamId,
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (!football) {
    return (
      <p
        className="mt-3 pt-3 text-xs"
        style={{ borderTop: "1px solid var(--mint-100)", color: "var(--text-muted)" }}
      >
        {texts.seriesResultNotReady}
      </p>
    );
  }

  return (
    <form
      onSubmit={save}
      className="mt-3 pt-3 space-y-3"
      style={{ borderTop: "1px solid var(--mint-100)" }}
    >
      <p
        className="text-center font-black text-lg"
        style={{ color: "var(--mint-700)" }}
        aria-live="polite"
      >
        <bdi>{match.homeTeam.name}</bdi> <Scoreline home={hs} away={as} />{" "}
        <bdi>{match.awayTeam.name}</bdi>
      </p>

      {suspendedPresent.length > 0 && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          <IconLabel name="ban">
            {disciplineTexts.hiddenSuspended(
              suspendedPresent.map((m) => m.fullName).join(lists.separator),
            )}
          </IconLabel>
        </p>
      )}

      <ForfeitToggle
        sides={sides}
        homeTeamId={match.homeTeam.id}
        scored={played}
        winnerTeamId={forfeitWinnerTeamId}
        onChange={setForfeitWinnerTeamId}
      />

      <GoalSection
        title={texts.goalsHeading}
        period="REGULAR"
        goals={goals}
        setGoals={setGoals}
        sides={sides}
        scorerRoster={scorerRoster}
        nameOf={nameOf}
      />

      {showExtra ? (
        <>
          {extraBlocked && <StaleNotice text={texts.extraTimeBlocked} />}
          <GoalSection
            title={texts.extraTimeHeading}
            period="EXTRA_TIME"
            goals={goals}
            setGoals={setGoals}
            sides={sides}
            scorerRoster={scorerRoster}
            nameOf={nameOf}
          />
        </>
      ) : (
        extraAllowed && (
          <button
            type="button"
            onClick={() => setExtraOpen(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
            style={{
              background: "white",
              color: "var(--mint-700)",
              border: "1px solid var(--mint-200)",
            }}
          >
            <IconLabel name="clock">{texts.extraTimeToggle}</IconLabel>
          </button>
        )
      )}

      {showKicks && (
        <div className="space-y-2">
          {kicksBlocked && <StaleNotice text={texts.shootoutBlocked} />}
          <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
            <IconLabel name="target">{texts.shootoutHeading}</IconLabel>{" "}
            {kicks.length > 0 && (
              <Scoreline
                home={kickTally.home}
                away={kickTally.away}
                style={{ color: "var(--mint-700)" }}
              />
            )}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {texts.shootoutHint}
          </p>
          {kicks.map((k, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-semibold flex-wrap">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center font-black shrink-0 leading-none"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                {sides.find((t) => t.id === k.teamId)?.name} — {nameOf(k.userId)}
              </span>
              <span
                className="badge shrink-0"
                style={
                  k.scored
                    ? { background: "#d1fae5", color: "#065f46" }
                    : { background: "#fee2e2", color: "#991b1b" }
                }
              >
                {k.scored ? texts.kickScored : texts.kickMissed}
              </span>
              {i === kicks.length - 1 && (
                <button
                  type="button"
                  onClick={() => setKicks((prev) => prev.slice(0, -1))}
                  aria-label={texts.remove}
                  className="px-1.5 rounded-lg"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  <Icon name="close" size={12} />
                </button>
              )}
            </div>
          ))}
          {kicksOk && (
            <KickAdder
              sides={sides}
              turnTeamId={
                kicks.length === 0
                  ? null
                  : nextKickTeamId(kicks, sides[0].id, match.homeTeam.id, match.awayTeam.id)
              }
              rosterOf={rosterOf}
              onAdd={(k) => setKicks((p) => [...p, k])}
            />
          )}
        </div>
      )}

      <div>
        <label
          htmlFor={`${uid}-motm`}
          className="text-xs font-semibold"
          style={{ color: "var(--text-muted)" }}
        >
          <IconLabel name="star" filled>
            {texts.motmOptional}
          </IconLabel>
        </label>
        <select
          id={`${uid}-motm`}
          name={`${uid}-motm`}
          autoComplete="off"
          value={manOfTheMatchId}
          onChange={(e) => setManOfTheMatchId(e.target.value)}
          className="input"
        >
          <option value="">{texts.motmNone}</option>
          {[...rosterOf(match.homeTeam.id), ...rosterOf(match.awayTeam.id)].map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          className="p-2.5 rounded-xl text-xs font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <IconLabel name="warning">{error}</IconLabel>
        </div>
      )}

      <button type="submit" disabled={loading || stale} className="btn btn-primary text-sm">
        {loading ? "..." : texts.saveResult}
      </button>
    </form>
  );
}

function StaleNotice({ text }: { text: string }) {
  return (
    <p
      className="p-2.5 rounded-xl text-xs font-semibold"
      style={{ background: "#fffbeb", color: "#92400e" }}
    >
      <IconLabel name="warning">{text}</IconLabel>
    </p>
  );
}
