"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { matchAdmin as texts, sidePlaceholders } from "@/lib/texts";
import type { Team } from "./types";

const EMPTY = {
  firstTeamId: "",
  secondTeamId: "",
  matchDate: "",
  round: "",
  venue: "",
  isKnockout: false,
};

export default function NewMatchForm({
  activityId,
  teams,
  football,
  onCreated,
}: {
  activityId: string;
  teams: Team[];
  football: boolean;
  onCreated: () => void;
}) {
  const sides = sidePlaceholders(football);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const firstTeam = teams.find((t) => t.id === form.firstTeamId);
  const awayTeamOptions = teams.filter((t) => {
    if (t.id === form.firstTeamId) return false;
    if (form.isKnockout) return true;
    if (!firstTeam || firstTeam.groupId === null || t.groupId === null) return true;
    return t.groupId === firstTeam.groupId;
  });

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!form.firstTeamId || !form.secondTeamId) {
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
        {!football && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {texts.seriesOrderFromTheDraw}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.firstTeamId}
            onChange={(e) =>
              setForm((p) => ({ ...p, firstTeamId: e.target.value, secondTeamId: "" }))
            }
            className="input"
          >
            <option value="">{sides.first}</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={form.secondTeamId}
            onChange={(e) => setForm((p) => ({ ...p, secondTeamId: e.target.value }))}
            className="input"
          >
            <option value="">{sides.second}</option>
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
              setForm((p) => ({ ...p, isKnockout: e.target.checked, secondTeamId: "" }))
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
