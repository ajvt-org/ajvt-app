"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { matchAdmin as texts } from "@/lib/texts";
import type { Team } from "./types";

const EMPTY = {
  homeTeamId: "",
  awayTeamId: "",
  matchDate: "",
  round: "",
  venue: "",
  isKnockout: false,
};

export default function NewMatchForm({
  activityId,
  teams,
  onCreated,
}: {
  activityId: string;
  teams: Team[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const homeTeam = teams.find((t) => t.id === form.homeTeamId);
  const awayTeamOptions = teams.filter((t) => {
    if (t.id === form.homeTeamId) return false;
    if (form.isKnockout) return true;
    if (!homeTeam || homeTeam.groupId === null || t.groupId === null) return true;
    return t.groupId === homeTeam.groupId;
  });

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!form.homeTeamId || !form.awayTeamId) {
      setError(texts.pickBothTeams);
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/admin/activities/${activityId}/matches`, form);
      setForm(EMPTY);
      onCreated();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="card p-4">
      <summary
        className="disclosure-summary text-sm font-bold cursor-pointer flex items-center gap-1.5"
        style={{ color: "var(--text-main)" }}
      >
        <span className="min-w-0 flex-1">
          <IconLabel name="plus">{texts.newMatch}</IconLabel>
        </span>
        <Icon name="chevronDown" size={14} className="disclosure-chevron" />
      </summary>

      <form onSubmit={submit} className="space-y-3 mt-3">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.newMatchOutsidePlan}
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
        {error && (
          <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
            <IconLabel name="warning">{error}</IconLabel>
          </p>
        )}
        <button type="submit" disabled={saving} className="btn btn-primary text-sm">
          {saving ? "..." : texts.addMatch}
        </button>
      </form>
    </details>
  );
}
