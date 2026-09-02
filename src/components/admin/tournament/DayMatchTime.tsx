"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { timeOf } from "@/lib/tournamentDays";
import { daysTab as texts } from "@/lib/texts";

export default function DayMatchTime({
  matchDate,
  busy,
  onRetime,
}: {
  matchDate: string | null;
  busy: boolean;
  onRetime: (time: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const current = matchDate ? timeOf(new Date(matchDate)) : "";

  if (editing) {
    return (
      <input
        type="time"
        defaultValue={current}
        autoFocus
        onBlur={(e) => {
          const next = e.target.value;
          setEditing(false);
          if (next && next !== current) onRetime(next);
        }}
        disabled={busy}
        aria-label={texts.matchTime}
        className="input input-sm shrink-0"
        style={{ width: "auto" }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={busy}
      aria-label={texts.changeTime}
      className="match-time"
    >
      <Icon name="clock" size={12} />
      <span dir="ltr" className="optical-numeral">
        {current || texts.noTime}
      </span>
    </button>
  );
}
