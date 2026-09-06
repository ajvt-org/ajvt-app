"use client";

import IconLabel from "@/components/IconLabel";
import LockNote from "@/components/LockNote";
import { daysTab as texts, lists } from "@/lib/texts";
import DayHeading from "./DayHeading";
import DayMatchRow from "./DayMatchRow";
import { doubleBookedTeams, type TournamentDayRow } from "./daysTypes";

export default function DayCard({
  day,
  busy,
  onSetRest,
  onRemove,
  onRetime,
}: {
  day: TournamentDayRow;
  busy: boolean;
  onSetRest: (isRest: boolean) => void;
  onRemove: () => void;
  onRetime: (matchId: string, time: string) => void;
}) {
  const conflicts = doubleBookedTeams(day);
  const locked = day.matches.length > 0;

  return (
    <div
      className="card p-3 sm:p-4"
      style={day.isRest ? { background: "var(--cream)", border: "1px dashed var(--mint-300)" } : {}}
    >
      <div className="match-day-head flex items-center gap-2 flex-wrap">
        <DayHeading position={day.position} date={day.date} isRest={day.isRest} />
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onSetRest(!day.isRest)}
            disabled={busy || locked}
            className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-55"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            {day.isRest ? texts.makeMatchDay : texts.makeRestDay}
          </button>
          <span className="ps-2" style={{ borderInlineStart: "1px solid var(--mint-200)" }}>
            <button
              onClick={onRemove}
              disabled={busy || locked}
              className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-55"
              style={{ background: "transparent", color: "#dc2626", border: "1px solid #fecaca" }}
            >
              <IconLabel name="trash">{texts.removeDay}</IconLabel>
            </button>
          </span>
        </div>
      </div>

      {locked && <LockNote>{texts.dayLocked}</LockNote>}

      {conflicts.length > 0 && (
        <p
          className="text-xs font-bold mt-2 rounded-lg px-3 py-2"
          style={{ background: "#fef3c7", color: "#92400e" }}
        >
          <IconLabel name="warning">
            {texts.doubleBooked(conflicts.join(lists.separator))}
          </IconLabel>
        </p>
      )}

      {day.matches.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {day.matches.map((match) => (
            <DayMatchRow
              key={match.id}
              match={match}
              busy={busy}
              onRetime={(time) => onRetime(match.id, time)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
