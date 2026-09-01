"use client";

import { useState } from "react";
import type { Match, Team } from "./types";
import CardChip from "@/components/tournament/CardChip";
import { api, errorMessage } from "@/lib/api";
import { matchAdmin as texts } from "@/lib/texts";
import FieldRow from "@/components/admin/FieldRow";
import Icon from "@/components/Icon";
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
  const [userId, setUserId] = useState("");
  const [cardType, setCardType] = useState<"YELLOW" | "RED">("YELLOW");
  const [minute, setMinute] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const banned = new Set(suspendedIds);
  const roster = (teams.find((t) => t.id === teamId)?.members.map((m) => m.member) || []).filter(
    (m) => !banned.has(m.id) || m.id === userId,
  );

  function reset() {
    setEditingId(null);
    setTeamId(match.homeTeam.id);
    setUserId("");
    setCardType("YELLOW");
    setMinute("");
  }

  function startEditing(booking: Match["bookings"][number]) {
    setEditingId(booking.id);
    setTeamId(booking.teamId);
    setUserId(booking.member.id);
    setCardType(booking.cardType === "RED" ? "RED" : "YELLOW");
    setMinute(booking.minute != null ? String(booking.minute) : "");
  }

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    setError("");
    setLoading(true);
    try {
      const body = { userId, teamId, cardType, minute: minute || null };
      if (editingId) await api.patch(`/api/admin/bookings/${editingId}`, body);
      else await api.post(`/api/admin/matches/${match.id}/bookings`, body);
      reset();
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function removeBooking(bookingId: string) {
    setError("");
    setLoading(true);
    try {
      await api.del(`/api/admin/bookings/${bookingId}`);
      if (editingId === bookingId) reset();
      onChange();
    } catch (e) {
      setError(errorMessage(e));
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
            <div
              key={b.id}
              className="flex items-center justify-between text-xs rounded-lg"
              style={
                editingId === b.id
                  ? { background: "var(--mint-100)", padding: "2px 6px" }
                  : { padding: "2px 6px" }
              }
            >
              <span className="flex items-center gap-1.5">
                <CardChip type={b.cardType === "RED" ? "RED" : "YELLOW"} /> {b.member.fullName}
                {b.minute ? ` — ${texts.minute} ${b.minute}` : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => startEditing(b)}
                  aria-label={texts.edit}
                  className="px-1.5 rounded-lg"
                  style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                >
                  <Icon name="pencil" size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => removeBooking(b.id)}
                  aria-label={texts.remove}
                  className="px-1.5 rounded-lg"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  <Icon name="close" size={12} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={submit}
        className="rounded-xl p-3 space-y-2.5"
        style={{ background: "var(--mint-50)" }}
      >
        {editingId && (
          <p className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
            <IconLabel name="pencil">{texts.editingCard}</IconLabel>
          </p>
        )}
        <FieldRow label={texts.fieldTeam}>
          {(id) => (
            <select
              id={id}
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setUserId("");
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
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
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

        <div className="flex gap-2">
          <button type="submit" disabled={!userId || loading} className="btn btn-primary text-sm">
            <IconLabel name={editingId ? "check" : "plus"}>
              {editingId ? texts.saveEdit : texts.addCard}
            </IconLabel>
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="btn btn-ghost text-sm">
              {texts.cancelEdit}
            </button>
          )}
        </div>
      </form>
      {error && (
        <p className="text-xs" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
