"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import FieldRow from "@/components/admin/FieldRow";
import { mvpVote as texts } from "@/lib/texts";

export default function MvpVoteMinutesCard({
  activityId,
  minutes,
  onChange,
}: {
  activityId: string;
  minutes: number;
  onChange: () => void;
}) {
  const [draft, setDraft] = useState(String(minutes));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);
    try {
      await api.patch(`/api/admin/activities/${activityId}`, { mvpVoteMinutes: Number(draft) });
      setSaved(true);
      onChange();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="card p-4 space-y-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="star">{texts.tournamentMinutesTitle}</IconLabel>
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.tournamentMinutesHint}
      </p>
      <FieldRow label={texts.minutesLabel}>
        {(id) => (
          <input
            id={id}
            type="number"
            min={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="input text-sm"
          />
        )}
      </FieldRow>
      {error && (
        <p className="text-xs" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
      {saved && (
        <p className="text-xs" style={{ color: "var(--mint-700)" }}>
          {texts.minutesSaved}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary text-xs px-3"
        style={{ width: "auto" }}
      >
        {loading ? "..." : texts.saveMinutes}
      </button>
    </form>
  );
}
