"use client";

// Football results are event lists, the score is never typed. A goal row is
// credited to a team; an OWN_GOAL scorer comes off the other roster; a null
// member is an unknown scorer (مجهول). Kicks appear on a tied knockout match.
// Board matches keep the plain two-number form.

import { useId, useState } from "react";
import type { GoalKind, GoalPeriod, Match, Team } from "./types";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { discipline as disciplineTexts, matchAdmin as texts } from "@/lib/texts";

interface GoalDraft {
  teamId: string;
  memberId: string | null;
  kind: GoalKind;
  period: GoalPeriod;
  minute: string;
}

interface KickDraft {
  teamId: string;
  memberId: string | null;
  scored: boolean;
}

const KIND_LABEL: Record<GoalKind, string> = {
  GOAL: texts.kindGoal,
  PENALTY: texts.kindPenalty,
  OWN_GOAL: texts.kindOwnGoal,
};

function goalSuffix(kind: GoalKind) {
  if (kind === "PENALTY") return ` (${texts.kindPenalty})`;
  if (kind === "OWN_GOAL") return ` (${texts.kindOwnGoal})`;
  return "";
}

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
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hs = goals.filter((g) => g.teamId === match.homeTeam.id).length;
  const as = goals.length - hs;
  const tied = hs === as;
  const showKicks = football && match.isKnockout && tied;
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
        {match.homeTeam.name} <span dir="ltr">{`${hs} - ${as}`}</span> {match.awayTeam.name}
      </p>

      {suspendedPresent.length > 0 && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          <IconLabel name="ban">
            {disciplineTexts.hiddenSuspended(suspendedPresent.map((m) => m.fullName).join("، "))}
          </IconLabel>
        </p>
      )}

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
              <span dir="ltr" style={{ color: "var(--mint-700)" }}>
                {kickTally.home} - {kickTally.away}
              </span>
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

function GoalSection({
  title,
  period,
  goals,
  setGoals,
  sides,
  scorerRoster,
  nameOf,
}: {
  title: string;
  period: GoalPeriod;
  goals: GoalDraft[];
  setGoals: React.Dispatch<React.SetStateAction<GoalDraft[]>>;
  sides: { id: string; name: string }[];
  scorerRoster: (teamId: string, kind: GoalKind) => { id: string; fullName: string }[];
  nameOf: (memberId: string | null) => string;
}) {
  const [teamId, setTeamId] = useState(sides[0].id);
  const [kind, setKind] = useState<GoalKind>("GOAL");
  const [memberId, setMemberId] = useState("");
  const [minute, setMinute] = useState("");

  const mine = goals.map((g, index) => ({ g, index })).filter(({ g }) => g.period === period);

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="ball">{title}</IconLabel>
      </p>
      {period === "REGULAR" && mine.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.goalless}
        </p>
      )}
      {mine.map(({ g, index }) => (
        <div key={index} className="flex items-center gap-2 text-xs font-semibold flex-wrap">
          <Icon name="ball" size={13} />
          <span className="min-w-0">
            {sides.find((t) => t.id === g.teamId)?.name} — {nameOf(g.memberId)}
            {g.minute ? ` ${g.minute}'` : ""}
            {goalSuffix(g.kind)}
          </span>
          <button
            type="button"
            onClick={() => setGoals((prev) => prev.filter((_, j) => j !== index))}
            aria-label={texts.remove}
            className="px-1.5 rounded-lg"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={teamId}
          onChange={(e) => {
            setTeamId(e.target.value);
            setMemberId("");
          }}
          className="input text-sm"
          style={{ width: "auto" }}
        >
          {sides.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as GoalKind);
            setMemberId("");
          }}
          className="input text-sm"
          style={{ width: "auto" }}
        >
          {(Object.keys(KIND_LABEL) as GoalKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="input text-sm flex-1"
        >
          <option value="">{texts.unknownScorer}</option>
          {scorerRoster(teamId, kind).map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={130}
          placeholder={texts.minute}
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          className="input text-sm"
          style={{ width: "80px" }}
        />
        <button
          type="button"
          onClick={() => {
            setGoals((prev) => [
              ...prev,
              { teamId, kind, memberId: memberId || null, period, minute },
            ]);
            setMemberId("");
            setMinute("");
          }}
          className="btn btn-primary text-xs px-3"
          style={{ width: "auto" }}
        >
          {texts.add}
        </button>
      </div>
    </div>
  );
}

function KickAdder({
  sides,
  rosterOf,
  onAdd,
}: {
  sides: { id: string; name: string }[];
  rosterOf: (teamId: string) => { id: string; fullName: string }[];
  onAdd: (kick: KickDraft) => void;
}) {
  const [teamId, setTeamId] = useState(sides[0].id);
  const [memberId, setMemberId] = useState("");
  const [scored, setScored] = useState(true);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select
        value={teamId}
        onChange={(e) => {
          setTeamId(e.target.value);
          setMemberId("");
        }}
        className="input text-sm"
        style={{ width: "auto" }}
      >
        {sides.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <select
        value={memberId}
        onChange={(e) => setMemberId(e.target.value)}
        className="input text-sm flex-1"
      >
        <option value="">{texts.unknownScorer}</option>
        {rosterOf(teamId).map((m) => (
          <option key={m.id} value={m.id}>
            {m.fullName}
          </option>
        ))}
      </select>
      <select
        value={scored ? "yes" : "no"}
        onChange={(e) => setScored(e.target.value === "yes")}
        className="input text-sm"
        style={{ width: "auto" }}
      >
        <option value="yes">{texts.kickScored}</option>
        <option value="no">{texts.kickMissed}</option>
      </select>
      <button
        type="button"
        onClick={() => {
          onAdd({ teamId, memberId: memberId || null, scored });
          setMemberId("");
        }}
        className="btn btn-primary text-xs px-3"
        style={{ width: "auto" }}
      >
        {texts.add}
      </button>
    </div>
  );
}
