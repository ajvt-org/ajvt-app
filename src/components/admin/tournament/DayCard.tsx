"use client";

import IconLabel from "@/components/IconLabel";
import { fixtureName } from "@/lib/fixtureTeams";
import { daysTab as texts, lists } from "@/lib/texts";
import DayHeading from "./DayHeading";
import DayMatchTime from "./DayMatchTime";
import DayMatchResult from "./DayMatchResult";
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
  const removable = day.isRest || day.matches.length === 0;

  return (
    <div
      className="card p-3 sm:p-4"
      style={day.isRest ? { background: "var(--cream)", border: "1px dashed var(--mint-300)" } : {}}
    >
      <div className="match-day-head flex items-center gap-2 flex-wrap">
        <DayHeading position={day.position} date={day.date} isRest={day.isRest} />
        {day.isRest && (
          <span
            className="text-xs px-2 py-0.5 rounded-lg font-bold shrink-0"
            style={{ background: "#fef3c7", color: "#b45309" }}
          >
            {texts.restDay}
          </span>
        )}
        {removable && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSetRest(!day.isRest)}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg font-bold"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              {day.isRest ? texts.makeMatchDay : texts.makeRestDay}
            </button>
            <span className="ps-2" style={{ borderInlineStart: "1px solid var(--mint-200)" }}>
              <button
                onClick={onRemove}
                disabled={busy}
                className="text-xs px-3 py-1.5 rounded-lg font-bold"
                style={{ background: "transparent", color: "#dc2626", border: "1px solid #fecaca" }}
              >
                <IconLabel name="trash">{texts.removeDay}</IconLabel>
              </button>
            </span>
          </div>
        )}
      </div>

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
            <li key={match.id} className="flex items-start gap-2 text-sm">
              <DayMatchTime
                matchDate={match.matchDate}
                busy={busy}
                onRetime={(time) => onRetime(match.id, time)}
              />
              <div className="min-w-0 flex-1">
                <bdi className="font-bold block" style={{ wordBreak: "break-word" }}>
                  {fixtureName(match)}
                </bdi>
                {(match.venue || match.status === "PLAYED") && (
                  <span className="flex flex-wrap items-center gap-2 mt-0.5">
                    {match.venue && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        <IconLabel name="pin">{match.venue}</IconLabel>
                      </span>
                    )}
                    <DayMatchResult match={match} />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
