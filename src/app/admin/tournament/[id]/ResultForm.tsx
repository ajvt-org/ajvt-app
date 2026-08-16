"use client";

import { useId, useState } from "react";
import type { Match, Team } from "./types";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

export default function ResultForm({
  match,
  teams,
  onSaved,
}: {
  match: Match;
  teams: Team[];
  onSaved: () => void;
}) {
  // A result form is drawn per match, so ids come from useId rather than the
  // match, which would repeat if the same two teams meet twice.
  const uid = useId();
  const homeRoster =
    teams.find((t) => t.id === match.homeTeam.id)?.members.map((m) => m.member) || [];
  const awayRoster =
    teams.find((t) => t.id === match.awayTeam.id)?.members.map((m) => m.member) || [];
  const combinedRoster = [...homeRoster, ...awayRoster];
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? "");
  const [homeGoals, setHomeGoals] = useState<{ memberId: string; count: string; minute: string }[]>(
    match.goals
      .filter((g) => g.teamId === match.homeTeam.id)
      .map((g) => ({
        memberId: g.member.id,
        count: String(g.count),
        minute: g.minute != null ? String(g.minute) : "",
      })),
  );
  const [awayGoals, setAwayGoals] = useState<{ memberId: string; count: string; minute: string }[]>(
    match.goals
      .filter((g) => g.teamId === match.awayTeam.id)
      .map((g) => ({
        memberId: g.member.id,
        count: String(g.count),
        minute: g.minute != null ? String(g.minute) : "",
      })),
  );
  const [homePenalties, setHomePenalties] = useState(match.homePenalties?.toString() ?? "");
  const [awayPenalties, setAwayPenalties] = useState(match.awayPenalties?.toString() ?? "");
  const [manOfTheMatchId, setManOfTheMatchId] = useState(match.manOfTheMatch?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scoresTied = homeScore !== "" && awayScore !== "" && homeScore === awayScore;
  const showPenalties = match.isKnockout && scoresTied;

  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        homeGoals: homeGoals
          .filter((g) => g.memberId)
          .map((g) => ({
            memberId: g.memberId,
            count: Number(g.count) || 1,
            minute: g.minute || null,
          })),
        awayGoals: awayGoals
          .filter((g) => g.memberId)
          .map((g) => ({
            memberId: g.memberId,
            count: Number(g.count) || 1,
            minute: g.minute || null,
          })),
        manOfTheMatchId: manOfTheMatchId || null,
      };
      if (showPenalties && homePenalties !== "" && awayPenalties !== "") {
        body.homePenalties = Number(homePenalties);
        body.awayPenalties = Number(awayPenalties);
      }
      await api.patch(`/api/admin/matches/${match.id}`, body);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="mt-3 pt-3 space-y-3"
      style={{ borderTop: "1px solid var(--mint-100)" }}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor={`${uid}-home`}
            className="text-xs font-semibold"
            style={{ color: "var(--text-muted)" }}
          >
            {match.homeTeam.name}
          </label>
          <input
            id={`${uid}-home`}
            type="number"
            min={0}
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            required
            className="input"
          />
        </div>
        <div>
          <label
            htmlFor={`${uid}-away`}
            className="text-xs font-semibold"
            style={{ color: "var(--text-muted)" }}
          >
            {match.awayTeam.name}
          </label>
          <input
            id={`${uid}-away`}
            type="number"
            min={0}
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            required
            className="input"
          />
        </div>
      </div>

      {showPenalties && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
            ركلات الترجيح (النتيجة متعادلة — مباراة إقصائية)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              placeholder="ركلات المضيف"
              value={homePenalties}
              onChange={(e) => setHomePenalties(e.target.value)}
              className="input"
            />
            <input
              type="number"
              min={0}
              placeholder="ركلات الضيف"
              value={awayPenalties}
              onChange={(e) => setAwayPenalties(e.target.value)}
              className="input"
            />
          </div>
        </div>
      )}

      <GoalRows
        label={`هدافو ${match.homeTeam.name} (اختياري)`}
        rows={homeGoals}
        setRows={setHomeGoals}
        teamMembers={homeRoster}
      />
      <GoalRows
        label={`هدافو ${match.awayTeam.name} (اختياري)`}
        rows={awayGoals}
        setRows={setAwayGoals}
        teamMembers={awayRoster}
      />

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
          {combinedRoster.map((m) => (
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
          ⚠️ {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary text-sm">
        {loading ? "..." : "حفظ النتيجة"}
      </button>
    </form>
  );
}

export function GoalRows({
  label,
  rows,
  setRows,
  teamMembers,
}: {
  label: string;
  rows: { memberId: string; count: string; minute: string }[];
  setRows: (
    fn: (
      prev: { memberId: string; count: string; minute: string }[],
    ) => { memberId: string; count: string; minute: string }[],
  ) => void;
  teamMembers: { id: string; fullName: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      {teamMembers.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          لا يوجد لاعبون في هذا الفريق بعد
        </p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={row.memberId}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, memberId: e.target.value } : r)),
                  )
                }
                className="input flex-1 text-sm"
              >
                <option value="">اختر لاعباً...</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={row.count}
                title="عدد الأهداف"
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, count: e.target.value } : r)),
                  )
                }
                className="input text-sm"
                style={{ width: "55px" }}
              />
              <input
                type="number"
                min={1}
                max={130}
                placeholder="الدقيقة"
                value={row.minute}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, minute: e.target.value } : r)),
                  )
                }
                className="input text-sm"
                style={{ width: "70px" }}
              />
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="حذف السطر"
                className="px-2 rounded-lg flex items-center justify-center"
                style={{ background: "#fee2e2", color: "#991b1b" }}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { memberId: "", count: "1", minute: "" }])}
            className="text-xs px-2.5 py-1 rounded-lg font-bold"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <IconLabel name="plus">إضافة هداف</IconLabel>
          </button>
        </div>
      )}
    </div>
  );
}
