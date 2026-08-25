"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import CardChip from "../CardChip";
import PlayerAvatar from "../PlayerAvatar";
import type { TimelineEntry } from "@/lib/matchEvents";
import { matchTone, type MatchTone } from "./tone";
import { matchDisplay as texts } from "@/lib/texts";

function EntryIcon({ type }: { type: TimelineEntry["type"] }) {
  if (type === "yellow") return <CardChip type="YELLOW" />;
  if (type === "red") return <CardChip type="RED" />;
  return <Icon name="ball" size={13} />;
}

export default function MatchTimeline({
  entries,
  teams,
  tone = "light",
}: {
  entries: TimelineEntry[];
  teams?: { home: string; away: string };
  tone?: MatchTone;
}) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;
  const { event: color, rule, muted } = matchTone[tone];

  return (
    <div style={{ borderTop: `1px solid ${rule}` }} className="pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs font-bold inline-flex items-center gap-1.5"
        style={{ color: muted }}
      >
        <span className="optical-name">{open ? texts.hideTimeline : texts.timeline}</span>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={13} />
      </button>

      {open && (
        <div
          className="grid gap-x-2 gap-y-1 mt-2 text-xs font-bold"
          style={{ gridTemplateColumns: "auto auto auto minmax(0,1fr) auto", color }}
        >
          {entries.map((entry) => (
            <div key={entry.key} className="contents">
              <span className="h-6 flex items-center justify-center w-8">
                <bdi className="optical-numeral">{entry.minute ? `${entry.minute}'` : "—"}</bdi>
              </span>
              <span className="h-6 flex items-center justify-center w-5">
                <EntryIcon type={entry.type} />
              </span>
              <span className="h-6 flex items-center">
                <PlayerAvatar photo={entry.photo} fullName={entry.name} size={18} />
              </span>
              <span className="leading-6 optical-name" style={{ fontSize: 10 }}>
                {entry.name}
                {entry.note}
              </span>
              <span
                className="leading-6 optical-name whitespace-nowrap"
                style={{ fontSize: 10, color: muted }}
              >
                {teams && entry.side ? teams[entry.side] : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
