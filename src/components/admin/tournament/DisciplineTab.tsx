"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { counted } from "@/lib/arabicCount";
import { MATCH } from "@/lib/messages";
import { discipline as texts } from "@/lib/texts";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import IconLabel from "@/components/IconLabel";
import type { DisciplineRules, Suspension, Team } from "./types";

function untilDate(value: string) {
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium" }).format(new Date(value));
}

function scopeText(s: Suspension) {
  if (s.scope === "INDEFINITE") return texts.indefinite;
  if (s.scope === "MATCHES") return texts.remaining(counted(s.matches ?? 0, MATCH));
  return s.until ? texts.until(untilDate(s.until)) : texts.indefinite;
}

function SuspensionCard({
  suspension,
  actions,
}: {
  suspension: Suspension;
  actions?: React.ReactNode;
}) {
  const s = suspension;
  return (
    <div className="card p-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5 min-w-0">
        <PlayerAvatar photo={s.member.photo} fullName={s.member.fullName} size={32} />
        <div className="min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: "var(--text-main)" }}>
            {s.member.fullName}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap text-xs mt-0.5">
            <span className="badge badge-rejected">{texts.reasons[s.reason]}</span>
            <span style={{ color: "var(--text-muted)" }}>{scopeText(s)}</span>
            {s.status === "ACTIVE" && !s.running && (
              <span className="badge badge-pending">{texts.expired}</span>
            )}
          </div>
          {s.note && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {s.note}
            </p>
          )}
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {s.createdBy === texts.system ? texts.systemProposal : texts.proposedBy(s.createdBy)}
          </p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export default function DisciplineTab({
  activityId,
  teams,
  suspensions,
  rules,
  onChange,
}: {
  activityId: string;
  teams: Team[];
  suspensions: Suspension[];
  rules: DisciplineRules | null;
  onChange: () => void;
}) {
  const players = [
    ...new Map(
      teams.flatMap((t) => t.members.map((m) => [m.member.id, m.member] as const)),
    ).values(),
  ].sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));

  const proposals = suspensions.filter((s) => s.status === "PROPOSED");
  const active = suspensions.filter((s) => s.status === "ACTIVE");
  const past = suspensions.filter((s) => s.status === "LIFTED");

  const [form, setForm] = useState({
    userId: "",
    scope: "MATCHES",
    matches: "1",
    until: "",
    note: "",
  });
  const [rulesDraft, setRulesDraft] = useState({
    yellowsForBan: rules ? String(rules.yellowsForBan) : "2",
    redBanMatches: rules ? String(rules.redBanMatches) : "1",
  });
  const [loading, setLoading] = useState(false);
  const [rulesSaved, setRulesSaved] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<unknown>) {
    setError("");
    setLoading(true);
    try {
      await action();
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const decide = (id: string, approve: boolean) =>
    run(() => api.patch(`/api/admin/activities/${activityId}/suspensions/${id}`, { approve }));

  const lift = (id: string) =>
    run(() => api.del(`/api/admin/activities/${activityId}/suspensions/${id}`));

  function propose(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    return run(async () => {
      await api.post(`/api/admin/activities/${activityId}/suspensions`, {
        userId: form.userId,
        scope: form.scope,
        matches: form.scope === "MATCHES" ? Number(form.matches) : null,
        until: form.scope === "DAYS" && form.until ? form.until : null,
        note: form.note || null,
      });
      setForm({ userId: "", scope: "MATCHES", matches: "1", until: "", note: "" });
    });
  }

  function saveRules(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setRulesSaved(false);
    return run(async () => {
      await api.patch(`/api/admin/activities/${activityId}`, {
        yellowsForBan: Number(rulesDraft.yellowsForBan),
        redBanMatches: Number(rulesDraft.redBanMatches),
      });
      setRulesSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="p-3 rounded-xl text-sm font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <IconLabel name="warning">{error}</IconLabel>
        </div>
      )}

      {proposals.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            <IconLabel name="clock">{texts.proposalsTitle}</IconLabel>
          </p>
          <div className="space-y-2">
            {proposals.map((s) => (
              <SuspensionCard
                key={s.id}
                suspension={s}
                actions={
                  <>
                    <button
                      onClick={() => decide(s.id, true)}
                      disabled={loading}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
                      style={{ background: "var(--mint-700)", color: "white" }}
                    >
                      <IconLabel name="check">{texts.approve}</IconLabel>
                    </button>
                    <button
                      onClick={() => decide(s.id, false)}
                      disabled={loading}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
                      style={{ background: "#fee2e2", color: "#991b1b" }}
                    >
                      <IconLabel name="close">{texts.dismiss}</IconLabel>
                    </button>
                  </>
                }
              />
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            <IconLabel name="ban">{texts.activeTitle}</IconLabel>
          </p>
          <div className="space-y-2">
            {active.map((s) => (
              <SuspensionCard
                key={s.id}
                suspension={s}
                actions={
                  <button
                    onClick={() => lift(s.id)}
                    disabled={loading}
                    className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
                    style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                  >
                    {texts.lift}
                  </button>
                }
              />
            ))}
          </div>
        </div>
      )}

      {proposals.length === 0 && active.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
          {texts.empty}
        </p>
      )}

      <form onSubmit={propose} className="card p-4 space-y-3">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="ban">{texts.proposeTitle}</IconLabel>
        </p>
        <select
          value={form.userId}
          onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))}
          required
          className="input"
        >
          <option value="">{texts.pickPlayer}</option>
          {players.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </select>
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
            {texts.scopeLabel}
          </p>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                ["MATCHES", texts.scopeMatches],
                ["DAYS", texts.scopeDays],
                ["INDEFINITE", texts.scopeIndefinite],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer"
                style={{
                  background: form.scope === value ? "var(--mint-100)" : "white",
                  border:
                    form.scope === value
                      ? "1.5px solid var(--mint-500)"
                      : "1.5px solid var(--mint-100)",
                  color: "var(--text-main)",
                }}
              >
                <input
                  type="radio"
                  name="suspension-scope"
                  checked={form.scope === value}
                  onChange={() => setForm((p) => ({ ...p, scope: value }))}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        {form.scope === "MATCHES" && (
          <input
            type="number"
            min={1}
            max={50}
            value={form.matches}
            onChange={(e) => setForm((p) => ({ ...p, matches: e.target.value }))}
            aria-label={texts.matchesCount}
            required
            className="input"
          />
        )}
        {form.scope === "DAYS" && (
          <input
            type="date"
            value={form.until}
            onChange={(e) => setForm((p) => ({ ...p, until: e.target.value }))}
            aria-label={texts.untilDate}
            required
            className="input"
          />
        )}
        <input
          type="text"
          maxLength={200}
          placeholder={texts.notePlaceholder}
          value={form.note}
          onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
          className="input"
        />
        <button
          type="submit"
          disabled={loading || !form.userId}
          className="btn btn-primary text-sm"
        >
          {loading ? "..." : texts.propose}
        </button>
      </form>

      <form onSubmit={saveRules} className="card p-4 space-y-3">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="gear">{texts.rulesTitle}</IconLabel>
        </p>
        <label className="block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          {texts.yellowsForBan}
          <input
            type="number"
            min={1}
            max={10}
            value={rulesDraft.yellowsForBan}
            onChange={(e) => setRulesDraft((p) => ({ ...p, yellowsForBan: e.target.value }))}
            required
            className="input mt-1"
          />
        </label>
        <label className="block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          {texts.redBanMatches}
          <input
            type="number"
            min={1}
            max={10}
            value={rulesDraft.redBanMatches}
            onChange={(e) => setRulesDraft((p) => ({ ...p, redBanMatches: e.target.value }))}
            required
            className="input mt-1"
          />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="btn btn-primary text-sm">
            {loading ? "..." : texts.saveRules}
          </button>
          {rulesSaved && (
            <span className="text-xs font-semibold" style={{ color: "var(--mint-700)" }}>
              <IconLabel name="check">{texts.rulesSaved}</IconLabel>
            </span>
          )}
        </div>
      </form>

      {past.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            <IconLabel name="clock">{texts.historyTitle}</IconLabel>
          </p>
          <div className="space-y-2" style={{ opacity: 0.7 }}>
            {past.map((s) => (
              <SuspensionCard key={s.id} suspension={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
