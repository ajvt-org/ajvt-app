"use client";

import { useState } from "react";
import type { Match, Team } from "./types";
import CardChip from "@/components/tournament/CardChip";
import { api, errorMessage } from "@/lib/api";
import { matchAdmin as texts } from "@/lib/texts";
import FieldRow from "@/components/admin/FieldRow";
import IconLabel from "@/components/IconLabel";

export default function BookingsForm({
  match,
  teams,
  suspendedIds,
  onChange,
}: {
  match: Match;
  teams: Team[];
  suspendedIds: string[];
  onChange: () => void;
}) {
  const [teamId, setTeamId] = useState(match.homeTeam.id);
  const [memberId, setMemberId] = useState("");
  const [cardType, setCardType] = useState<"YELLOW" | "RED">("YELLOW");
  const [minute, setMinute] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const banned = new Set(suspendedIds);
  const roster = (teams.find((t) => t.id === teamId)?.members.map((m) => m.member) || []).filter(
    (m) => !banned.has(m.id),
  );

  async function addBooking(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!memberId) return;
    setError("");
    setLoading(true);
    try {
      await api.post(`/api/admin/matches/${match.id}/bookings`, {
        memberId,
        teamId,
        cardType,
        minute: minute || null,
      });
      setMemberId("");
      setMinute("");
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function removeBooking(bookingId: string) {
    setLoading(true);
    try {
      await fetch(`/api/admin/bookings/${bookingId}`, { method: "DELETE" });
      onChange();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
      <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
        <CardChip type="YELLOW" /> <CardChip type="RED" /> {texts.cardsHeading}
      </p>
      {match.bookings.length > 0 && (
        <div className="space-y-1">
          {match.bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <CardChip type={b.cardType === "RED" ? "RED" : "YELLOW"} /> {b.member.fullName}
                {b.minute ? ` — ${texts.minute} ${b.minute}` : ""}
              </span>
              <button
                onClick={() => removeBooking(b.id)}
                className="font-bold"
                style={{ color: "#991b1b" }}
              >
                {texts.remove}
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={addBooking}
        className="rounded-xl p-3 space-y-2.5"
        style={{ background: "var(--mint-50)" }}
      >
        <FieldRow label={texts.fieldTeam}>
          {(id) => (
            <select
              id={id}
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setMemberId("");
              }}
              className="input text-sm"
            >
              <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
              <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
            </select>
          )}
        </FieldRow>

        <FieldRow label={texts.fieldPlayer}>
          {(id) => (
            <select
              id={id}
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="input text-sm"
            >
              <option value="">{texts.pickPlayer}</option>
              {roster.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          )}
        </FieldRow>

        <FieldRow label={texts.fieldCard}>
          {(id) => (
            <select
              id={id}
              value={cardType}
              onChange={(e) => setCardType(e.target.value as "YELLOW" | "RED")}
              className="input text-sm"
            >
              <option value="YELLOW">{texts.yellowCard}</option>
              <option value="RED">{texts.redCard}</option>
            </select>
          )}
        </FieldRow>

        <FieldRow label={texts.fieldMinute} hint={texts.minuteHint}>
          {(id) => (
            <input
              id={id}
              type="number"
              min={1}
              max={130}
              inputMode="numeric"
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              className="input text-sm"
            />
          )}
        </FieldRow>

        <button type="submit" disabled={!memberId || loading} className="btn btn-primary text-sm">
          <IconLabel name="plus">{texts.addCard}</IconLabel>
        </button>
      </form>
      {error && (
        <p className="text-xs" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
