import Icon from "@/components/Icon";
import { activityStanding } from "@/lib/activityStanding";
import { activityStandingTexts as texts } from "@/lib/texts";

export default function ActivityStandingChip({
  startsAt,
  endsAt,
  showUnscheduled,
}: {
  startsAt: string | Date | null;
  endsAt?: string | Date | null;
  showUnscheduled?: boolean;
}) {
  const standing = activityStanding({ startsAt, endsAt });
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

  return (
    <span
      className="badge shrink-0"
      style={{ background: "var(--mint-50)", color: "var(--text-muted)", fontSize: "10px" }}
    >
      {texts.finished}
    </span>
  );
}
