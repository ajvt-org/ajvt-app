"use client";

import { matchDateToLocalInput } from "@/lib/clubTime";
import { useState } from "react";
import type { Match, Team } from "./types";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import { matchAdmin as texts, sidePlaceholders } from "@/lib/texts";
import { entrantWording } from "@/lib/messages";
import type { EntrantKind } from "@/lib/entrant";
import { knockoutToggleAllowed } from "@/lib/tournament";

export default function MatchDetailsForm({
  match,
  teams,
  entrant,
  football,
  onChange,
}: {
  match: Match;
  teams: Team[];
  entrant: EntrantKind;
  football: boolean;
  onChange: () => void;
}) {
  const words = entrantWording(entrant);
  const sides = sidePlaceholders(football);
  const [matchDate, setMatchDate] = useState(
    match.matchDate ? matchDateToLocalInput(match.matchDate) : "",
  );
  const [round, setRound] = useState(match.round || "");
  const [venue, setVenue] = useState(match.venue || "");
  const [isKnockout, setIsKnockout] = useState(match.isKnockout);
  const [firstTeamId, setFirstTeamId] = useState(match.firstTeam?.id ?? "");
  const [secondTeamId, setSecondTeamId] = useState(match.secondTeam?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const groupOf = (id: string) => teams.find((t) => t.id === id)?.groupId ?? null;
  const knockoutOffered = knockoutToggleAllowed(
    match.isKnockout,
    match.bracketRound,
    groupOf(firstTeamId),
    groupOf(secondTeamId),
  );
  const effectiveKnockout = knockoutOffered && isKnockout;

  const bothSides = !!firstTeamId && !!secondTeamId;
  const neitherSide = !firstTeamId && !secondTeamId;

  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!bothSides && !neitherSide) {
      setError(words.bothEntrantsOrNeither);
      return;
    }
    if (bothSides && firstTeamId === secondTeamId) {
      setError(words.entrantAgainstItself);
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/api/admin/matches/${match.id}`, {
        matchDate: matchDate || null,
        round: round || null,
        venue: venue || null,
        isKnockout: effectiveKnockout,
        ...(bothSides ? { firstTeamId, secondTeamId } : {}),
      });
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const homeTeamForEdit = teams.find((t) => t.id === firstTeamId);
  const awayTeamOptionsForEdit = teams.filter((t) => {
    if (t.id === firstTeamId) return false;
    if (effectiveKnockout) return true;
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
          value={firstTeamId}
          onChange={(e) => {
            setFirstTeamId(e.target.value);
            setSecondTeamId("");
          }}
          className="input text-sm"
        >
          <option value="">{sides.first}</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={secondTeamId}
          onChange={(e) => setSecondTeamId(e.target.value)}
          className="input text-sm"
        >
          <option value="">{sides.second}</option>
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
          placeholder={texts.roundLabel}
          value={round}
          onChange={(e) => setRound(e.target.value)}
          maxLength={40}
          className="input text-sm"
        />
      </div>
      <input
        type="text"
        placeholder={texts.venueLabel}
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
        maxLength={60}
        className="input text-sm"
      />
      {knockoutOffered && (
        <label
          className="flex items-center gap-2 text-xs font-semibold"
          style={{ color: "var(--text-main)" }}
        >
          <input
            type="checkbox"
            checked={isKnockout}
            onChange={(e) => {
              setIsKnockout(e.target.checked);
              setSecondTeamId("");
            }}
          />
          <IconLabel name="trophy">{texts.knockoutMatch}</IconLabel>
        </label>
      )}
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
        {loading ? "..." : texts.saveDetails}
      </button>
    </form>
  );
}
