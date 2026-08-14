"use client";

import { useState } from "react";
import type { Match, Team } from "./types";
import { CARD_LABEL } from "./constants";
import { api, errorMessage } from "@/lib/api";

export default function BookingsForm({
  match,
  teams,
  onChange,
}: {
  match: Match;
  teams: Team[];
  onChange: () => void;
}) {
  const [teamId, setTeamId] = useState(match.homeTeam.id);
  const [memberId, setMemberId] = useState("");
  const [cardType, setCardType] = useState<"YELLOW" | "RED">("YELLOW");
  const [minute, setMinute] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roster = teams.find((t) => t.id === teamId)?.members.map((m) => m.member) || [];

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
      {match.bookings.length > 0 && (
        <div className="space-y-1">
          {match.bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between text-xs">
              <span>
                {CARD_LABEL[b.cardType]} {b.member.fullName}
                {b.minute ? ` — الدقيقة ${b.minute}` : ""}
              </span>
              <button
                onClick={() => removeBooking(b.id)}
                className="font-bold"
                style={{ color: "#991b1b" }}
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addBooking} className="flex flex-wrap gap-2 items-center">
        <select
          value={teamId}
          onChange={(e) => {
            setTeamId(e.target.value);
            setMemberId("");
          }}
          className="input text-sm"
          style={{ width: "auto" }}
        >
          <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
          <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
        </select>
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="input text-sm flex-1"
        >
          <option value="">اختر لاعباً...</option>
          {roster.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </select>
        <select
          value={cardType}
          onChange={(e) => setCardType(e.target.value as "YELLOW" | "RED")}
          className="input text-sm"
          style={{ width: "auto" }}
        >
          <option value="YELLOW">🟨</option>
          <option value="RED">🟥</option>
        </select>
        <input
          type="number"
          min={1}
          max={130}
          placeholder="الدقيقة"
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          className="input text-sm"
          style={{ width: "80px" }}
        />
        <button
          type="submit"
          disabled={!memberId || loading}
          className="btn btn-primary text-xs px-3"
          style={{ width: "auto" }}
        >
          إضافة
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
