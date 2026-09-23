"use client";

import LocalMoment from "@/components/LocalMoment";
import Countdown from "@/components/Countdown";
import Icon from "@/components/Icon";
import { useNow } from "@/hooks/useNow";
import { closingSoon, electionState, endsAt } from "@/lib/election";
import { electionMember as texts } from "@/lib/texts";

export default function ElectionClock({
  election,
  onReached,
  compact = false,
  now,
}: {
  election: { startsAt: string; durationMinutes: number };
  onReached?: () => void;
  compact?: boolean;
  now?: number;
}) {
  const ticked = useNow(1000);
  const at = new Date(now ?? ticked);
  const state = electionState(election, at);
  const close = endsAt(election);

  if (state === "ended") {
    return (
      <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
        <Icon name="clock" size={13} />
        {texts.endedOn} <LocalMoment at={close} />
      </p>
    );
  }

  const upcoming = state === "upcoming";
  const tone = upcoming || closingSoon(election, at) ? "var(--copper-600)" : "var(--mint-700)";

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
        color={tone}
        compact={compact}
        ariaLabel={upcoming ? texts.startsInLabel : texts.endsInLabel}
      />
    </div>
  );
}
