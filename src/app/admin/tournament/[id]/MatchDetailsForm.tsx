"use client";

import { matchDateToLocalInput } from "@/lib/clubTime";
import { useState } from "react";
import type { Match, Team } from "./types";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";

export default function MatchDetailsForm({
  match,
  teams,
  onChange,
}: {
  match: Match;
  teams: Team[];
  onChange: () => void;
}) {
  const [matchDate, setMatchDate] = useState(
    match.matchDate ? matchDateToLocalInput(match.matchDate) : "",
  );
  const [round, setRound] = useState(match.round || "");
  const [venue, setVenue] = useState(match.venue || "");
  const [isKnockout, setIsKnockout] = useState(match.isKnockout);
  const [homeTeamId, setHomeTeamId] = useState(match.homeTeam.id);
  const [awayTeamId, setAwayTeamId] = useState(match.awayTeam.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!awayTeamId) {
      setError("يجب اختيار الفريق الضيف");
      return;
    }
    if (homeTeamId === awayTeamId) {
      setError("لا يمكن أن يلعب الفريق ضد نفسه");
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/api/admin/matches/${match.id}`, {
        matchDate: matchDate || null,
        round: round || null,
        venue: venue || null,
        isKnockout,
        homeTeamId,
        awayTeamId,
      });
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const homeTeamForEdit = teams.find((t) => t.id === homeTeamId);
  const awayTeamOptionsForEdit = teams.filter((t) => {
    if (t.id === homeTeamId) return false;
    if (isKnockout) return true;
    if (!homeTeamForEdit || homeTeamForEdit.groupId === null || t.groupId === null) return true;
    return t.groupId === homeTeamForEdit.groupId;
  });

  return (
    <form
      onSubmit={save}
      className="mt-3 pt-3 space-y-2"
      style={{ borderTop: "1px solid var(--mint-100)" }}
    >
      <div className="grid grid-cols-2 gap-2">
        <select
          value={homeTeamId}
          onChange={(e) => {
            setHomeTeamId(e.target.value);
            setAwayTeamId("");
          }}
          className="input text-sm"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={awayTeamId}
          onChange={(e) => setAwayTeamId(e.target.value)}
          className="input text-sm"
        >
          <option value="">اختر الفريق الضيف...</option>
          {awayTeamOptionsForEdit.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="datetime-local"
          value={matchDate}
          onChange={(e) => setMatchDate(e.target.value)}
          className="input text-sm"
        />
        <input
          type="text"
          placeholder="الجولة"
          value={round}
          onChange={(e) => setRound(e.target.value)}
          maxLength={40}
          className="input text-sm"
        />
      </div>
      <input
        type="text"
        placeholder="الملعب"
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
        maxLength={60}
        className="input text-sm"
      />
      <label
        className="flex items-center gap-2 text-xs font-semibold"
        style={{ color: "var(--text-main)" }}
      >
        <input
          type="checkbox"
          checked={isKnockout}
          onChange={(e) => {
            setIsKnockout(e.target.checked);
            setAwayTeamId("");
          }}
        />
        <IconLabel name="trophy">مباراة خروج المغلوب</IconLabel>
      </label>
      {error && (
        <p className="text-xs" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary text-xs px-3"
        style={{ width: "auto" }}
      >
        {loading ? "..." : "حفظ التفاصيل"}
      </button>
    </form>
  );
}
