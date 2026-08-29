"use client";

import { useId, useState } from "react";
import type { GoalKind, Match, Team } from "./types";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Scoreline from "@/components/tournament/Scoreline";
import GoalSection from "./GoalSection";
import ForfeitToggle from "./ForfeitToggle";
import KickAdder from "./KickAdder";
import type { GoalDraft, KickDraft } from "./goalDraft";
import { forfeitScore } from "@/lib/forfeit";
import { discipline as disciplineTexts, matchAdmin as texts } from "@/lib/texts";

export default function ResultForm({
  match,
  teams,
  profile,
  suspendedIds,
  onSaved,
}: {
  match: Match;
  teams: Team[];
  profile: "FOOTBALL" | "BOARD";
  suspendedIds: string[];
  onSaved: () => void;
}) {
  const uid = useId();
  const football = profile === "FOOTBALL";
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
  const nameOf = (memberId: string | null) => {
    if (memberId === null) return texts.unknownScorer;
    for (const t of teams) {
      const hit = t.members.find((m) => m.member.id === memberId);
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
        memberId: g.member?.id ?? null,
        kind: g.kind,
        period: g.period,
        minute: g.minute != null ? String(g.minute) : "",
      })),
    ),
  );
  const [kicks, setKicks] = useState<KickDraft[]>(
    match.penaltyKicks.map((k) => ({
      teamId: k.teamId,
      memberId: k.member?.id ?? null,
      scored: k.scored,
    })),
  );
  const [showExtraTime, setShowExtraTime] = useState(
    match.goals.some((g) => g.period === "EXTRA_TIME"),
  );
  const [manOfTheMatchId, setManOfTheMatchId] = useState(match.manOfTheMatch?.id ?? "");
  const [forfeitWinnerTeamId, setForfeitWinnerTeamId] = useState<string | null>(
    match.forfeitWinnerTeamId,
  );
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scored = {
    home: goals.filter((g) => g.teamId === match.homeTeam.id).length,
    away: 0,
  };
  scored.away = goals.length - scored.home;
  const awarded = forfeitWinnerTeamId
    ? forfeitScore(scored, forfeitWinnerTeamId, match.homeTeam.id)
    : scored;
  const hs = awarded.home;
  const as = awarded.away;
  const tied = hs === as;
  const showKicks = football && match.isKnockout && tied && !forfeitWinnerTeamId;
  const kickTally = {
    home: kicks.filter((k) => k.teamId === match.homeTeam.id && k.scored).length,
    away: kicks.filter((k) => k.teamId === match.awayTeam.id && k.scored).length,
  };

  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (football) {
        await api.patch(`/api/admin/matches/${match.id}`, {
          goalEvents: goals.map((g) => ({
            teamId: g.teamId,
            memberId: g.memberId,
            kind: g.kind,
            period: g.period,
            minute: g.minute || null,
          })),
          penaltyKicks: showKicks ? kicks : [],
          manOfTheMatchId: manOfTheMatchId || null,
          forfeitWinnerTeamId,
        });
      } else {
        await api.patch(`/api/admin/matches/${match.id}`, {
          homeScore: Number(homeScore),
          awayScore: Number(awayScore),
        });
      }
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (!football) {
    return (
      <form
        onSubmit={save}
        className="mt-3 pt-3 space-y-3"
        style={{ borderTop: "1px solid var(--mint-100)" }}
      >
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              [match.homeTeam.name, homeScore, setHomeScore],
              [match.awayTeam.name, awayScore, setAwayScore],
            ] as const
          ).map(([name, value, set], i) => (
            <div key={i}>
              <label
                htmlFor={`${uid}-side-${i}`}
                className="text-xs font-semibold"
                style={{ color: "var(--text-muted)" }}
              >
                {name}
              </label>
              <input
                id={`${uid}-side-${i}`}
                type="number"
                min={0}
                value={value}
                onChange={(e) => set(e.target.value)}
                required
                className="input"
              />
            </div>
          ))}
        </div>
        {error && (
          <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn btn-primary text-sm">
          {loading ? "..." : texts.saveResult}
        </button>
      </form>
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
            {disciplineTexts.hiddenSuspended(suspendedPresent.map((m) => m.fullName).join("، "))}
          </IconLabel>
        </p>
      )}

      <ForfeitToggle
        sides={sides}
        homeTeamId={match.homeTeam.id}
        scored={scored}
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

      {showExtraTime ? (
        <GoalSection
          title={texts.extraTimeHeading}
          period="EXTRA_TIME"
          goals={goals}
          setGoals={setGoals}
          sides={sides}
          scorerRoster={scorerRoster}
          nameOf={nameOf}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowExtraTime(true)}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-200)",
          }}
        >
          <IconLabel name="clock">{texts.extraTimeToggle}</IconLabel>
        </button>
      )}

      {showKicks && (
        <div className="space-y-2">
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
                {sides.find((t) => t.id === k.teamId)?.name} — {nameOf(k.memberId)}
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
              <button
                type="button"
                onClick={() => setKicks((prev) => prev.filter((_, j) => j !== i))}
                aria-label={texts.remove}
                className="px-1.5 rounded-lg"
                style={{ background: "#fee2e2", color: "#991b1b" }}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
          <KickAdder sides={sides} rosterOf={rosterOf} onAdd={(k) => setKicks((p) => [...p, k])} />
        </div>
      )}

      <div>
        <label
          htmlFor={`${uid}-motm`}
          className="text-xs font-semibold"
          style={{ color: "var(--text-muted)" }}
        >
          <IconLabel name="star" filled>
            رجل المباراة (اختياري)
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
          <option value="">بدون</option>
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

      <button type="submit" disabled={loading} className="btn btn-primary text-sm">
        {loading ? "..." : texts.saveResult}
      </button>
    </form>
  );
}
