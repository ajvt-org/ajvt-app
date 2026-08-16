import type { ReactNode } from "react";
import Icon from "@/components/Icon";
import { groupMatchesByDay, type DatedMatch } from "@/lib/matchDays";

export default function MatchDayList<T extends DatedMatch & { id: string }>({
  matches,
  renderMatch,
}: {
  matches: T[];
  renderMatch: (match: T, day: { round: string | null; venue: string | null }) => ReactNode;
}) {
  const days = groupMatchesByDay(matches);

  return (
    <div className="space-y-4">
      {days.map((day) => (
        <div key={day.key} className="space-y-2">
          <div className="match-day-head">
            <p className="text-sm font-black" style={{ color: "var(--text-main)" }}>
              <Icon name="calendar" size={14} className="icon-inline" /> {day.label}
            </p>
            {(day.round || day.venue) && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {day.round}
                {day.round && day.venue && " · "}
                {day.venue && (
                  <>
                    <Icon name="pin" size={12} className="icon-inline" /> {day.venue}
                  </>
                )}
              </p>
            )}
          </div>
          <div className="space-y-2">
            {day.matches.map((match) => renderMatch(match, { round: day.round, venue: day.venue }))}
          </div>
        </div>
      ))}
    </div>
  );
}
