import IconLabel from "@/components/IconLabel";
import { fixtureName } from "@/lib/fixtureTeams";
import DayMatchTime from "./DayMatchTime";
import DayMatchResult from "./DayMatchResult";
import type { DayMatch } from "./daysTypes";

export default function DayMatchRow({
  match,
  busy,
  onRetime,
}: {
  match: DayMatch;
  busy: boolean;
  onRetime: (time: string) => void;
}) {
  return (
    <li className="flex items-start gap-2 text-sm sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-3">
      <DayMatchTime matchDate={match.matchDate} busy={busy} onRetime={onRetime} />
      <div className="min-w-0 flex-1">
        <bdi className="font-bold block" style={{ wordBreak: "break-word" }}>
          {fixtureName(match)}
        </bdi>
        {(match.round || match.venue) && (
          <span
            className="flex flex-wrap items-center gap-2 text-xs mt-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            {match.round && <span>{match.round}</span>}
            {match.venue && <IconLabel name="pin">{match.venue}</IconLabel>}
          </span>
        )}
      </div>
      <div className="flex justify-end mt-0.5 sm:mt-0">
        <DayMatchResult match={match} />
      </div>
    </li>
  );
}
