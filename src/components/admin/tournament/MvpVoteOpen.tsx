"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import FieldRow from "@/components/admin/FieldRow";
import { mvpVote as texts } from "@/lib/texts";

const MAX_CANDIDATES = 6;
const MIN_CANDIDATES = 2;

export default function MvpVoteOpen({
  matchId,
  played,
  roster,
  defaultMinutes,
  onChange,
}: {
  matchId: string;
  played: boolean;
  roster: { id: string; fullName: string }[];
  defaultMinutes: number;
  onChange: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(String(defaultMinutes));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_CANDIDATES
          ? prev
          : [...prev, id],
    );
  }

  async function create() {
    if (selected.length < MIN_CANDIDATES) {
      setError(texts.pickAtLeastTwo);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post(`/api/admin/matches/${matchId}/mvp-vote`, {
        candidateMemberIds: selected,
        minutes: Number(minutes),
      });
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (!played) return <Note text={texts.needsResult} />;
  if (roster.length < MIN_CANDIDATES) return <Note text={texts.needsRoster} />;

  return (
    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
      <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
        {texts.pickCandidates}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {roster.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
            style={{
              background: selected.includes(m.id) ? "var(--mint-600)" : "var(--mint-100)",
              color: selected.includes(m.id) ? "white" : "var(--mint-700)",
            }}
          >
            {m.fullName}
          </button>
        ))}
      </div>

      <FieldRow label={texts.minutesLabel}>
        {(id) => (
          <input
            id={id}
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="input text-sm"
          />
        )}
      </FieldRow>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.minutesHint(defaultMinutes)}
      </p>

      {error && (
        <p className="text-xs" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
      <button
        onClick={create}
        disabled={loading || selected.length < MIN_CANDIDATES}
        className="btn btn-primary text-xs px-3"
        style={{ width: "auto" }}
      >
        {loading ? "..." : <IconLabel name="star">{texts.start(selected.length)}</IconLabel>}
      </button>
    </div>
  );
}

function Note({ text }: { text: string }) {
  return (
    <p
      className="text-xs mt-3 pt-3"
      style={{ color: "var(--text-muted)", borderTop: "1px solid var(--mint-100)" }}
    >
      {text}
    </p>
  );
}
