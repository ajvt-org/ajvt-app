import Icon from "@/components/Icon";
import { activityStanding } from "@/lib/activityStanding";
import { bracketRoundLabel } from "@/lib/tournament";
import type { TournamentStage } from "@/lib/tournamentStage";
import { activityStandingTexts as texts } from "@/lib/texts";

function awaitingLabel(stage: TournamentStage | null, unplayed: number): string {
  if (!stage) return texts.awaiting(unplayed);
  return stage.kind === "group" ? texts.groupStage : bracketRoundLabel(stage.roundSize);
}

export default function ActivityStandingChip({
  startsAt,
  endsAt,
  unplayedMatches,
  awaitingStage,
  showUnscheduled,
}: {
  startsAt: string | Date | null;
  endsAt?: string | Date | null;
  unplayedMatches?: number;
  awaitingStage?: TournamentStage | null;
  showUnscheduled?: boolean;
}) {
  const standing = activityStanding({ startsAt, endsAt, unplayedMatches, awaitingStage });
  if (!standing) {
    if (!showUnscheduled) return null;
    return (
      <span
        className="badge shrink-0"
        style={{ background: "var(--mint-50)", color: "var(--text-muted)", fontSize: "10px" }}
      >
        {texts.notScheduled}
      </span>
    );
  }

  if (standing.state === "upcoming") {
    return (
      <span
        className="badge shrink-0 inline-flex items-center gap-1"
        style={{ background: "#fef3c7", color: "#b45309", fontSize: "10px" }}
      >
        <Icon name="hourglass" size={10} />
        {standing.daysUntil === 1 ? texts.startsTomorrow : texts.startsIn(standing.daysUntil)}
      </span>
    );
  }

  if (standing.state === "today") {
    return (
      <span
        className="badge shrink-0 inline-flex items-center gap-1.5"
        style={{ background: "var(--mint-600)", color: "white", fontSize: "10px" }}
      >
        <span className="live-dot" style={{ background: "#fff" }} />
        {texts.startsToday}
      </span>
    );
  }

  if (standing.state === "running") {
    return (
      <span
        className="badge shrink-0 inline-flex items-center gap-1.5"
        style={{ background: "#d1fae5", color: "#065f46", fontSize: "10px" }}
      >
        <span className="live-dot" />
        {texts.running}
      </span>
    );
  }

  if (standing.state === "awaiting") {
    return (
      <span
        className="badge shrink-0 inline-flex items-center gap-1"
        style={{ background: "#fef3c7", color: "#b45309", fontSize: "10px" }}
      >
        <Icon name="hourglass" size={10} />
        {awaitingLabel(standing.stage, standing.unplayed)}
      </span>
    );
  }

  return (
    <span
      className="badge shrink-0"
      style={{ background: "var(--mint-50)", color: "var(--text-muted)", fontSize: "10px" }}
    >
      {texts.finished}
    </span>
  );
}
