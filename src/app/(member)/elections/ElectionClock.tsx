"use client";

import Countdown from "@/components/Countdown";
import Icon from "@/components/Icon";
import { electionState, endsAt } from "@/lib/election";
import { formatDateTime } from "@/lib/clubTime";
import { electionMember as texts } from "@/lib/texts";

export default function ElectionClock({
  election,
  onReached,
  compact = false,
}: {
  election: { startsAt: string; durationMinutes: number };
  onReached?: () => void;
  compact?: boolean;
}) {
  const state = electionState(election);
  const close = endsAt(election);

  if (state === "ended") {
    return (
      <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
        <Icon name="clock" size={13} />
        {texts.endedOn} <bdi dir="ltr">{formatDateTime(close)}</bdi>
      </p>
    );
  }

  const upcoming = state === "upcoming";

  return (
    <div className={compact ? "flex items-center gap-1.5 flex-wrap" : "text-center"}>
      <span
        className="text-xs font-bold flex items-center gap-1.5"
        style={{ color: upcoming ? "var(--copper-600)" : "var(--mint-700)" }}
      >
        <Icon name="clock" size={13} />
        {upcoming ? texts.startsIn : texts.endsIn}
      </span>
      <Countdown
        opensAt={upcoming ? new Date(election.startsAt).toISOString() : close.toISOString()}
        onReached={onReached}
        color={upcoming ? "var(--copper-600)" : "var(--mint-700)"}
        compact={compact}
        ariaLabel={upcoming ? texts.startsInLabel : texts.endsInLabel}
      />
    </div>
  );
}
