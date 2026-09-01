"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import { timeOf } from "@/lib/tournamentDays";
import { fixtureName } from "@/lib/fixtureTeams";
import { dayLabel, doubleBookedTeams, type TournamentDayRow } from "./daysTypes";

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
  const [times, setTimes] = useState<Record<string, string>>({});
  const conflicts = doubleBookedTeams(day);

  return (
    <div
      className="card p-3 sm:p-4"
      style={day.isRest ? { background: "var(--cream)", border: "1px dashed var(--mint-300)" } : {}}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black" style={{ color: "var(--text-main)" }}>
            اليوم {day.position}
            <span className="font-semibold text-xs mr-2" style={{ color: "var(--text-muted)" }}>
              {dayLabel(day.date)}
            </span>
          </p>
        </div>
        {day.isRest ? (
          <>
            <span
              className="text-xs px-2 py-0.5 rounded-lg font-bold"
              style={{ background: "#fef3c7", color: "#b45309" }}
            >
              يوم راحة
            </span>
            <button
              onClick={() => onSetRest(false)}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg font-bold"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              جعله يوم مباريات
            </button>
            <button
              onClick={onRemove}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg font-bold"
              style={{ background: "transparent", color: "#dc2626", border: "1px solid #fecaca" }}
            >
              <IconLabel name="trash">حذف اليوم</IconLabel>
            </button>
          </>
        ) : day.matches.length === 0 ? (
          <>
            <button
              onClick={() => onSetRest(true)}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg font-bold"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              جعله يوم راحة
            </button>
            <button
              onClick={onRemove}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg font-bold"
              style={{ background: "transparent", color: "#dc2626", border: "1px solid #fecaca" }}
            >
              <IconLabel name="trash">حذف اليوم</IconLabel>
            </button>
          </>
        ) : null}
      </div>

      {conflicts.length > 0 && (
        <p
          className="text-xs font-bold mt-2 rounded-lg px-3 py-2"
          style={{ background: "#fef3c7", color: "#92400e" }}
        >
          <IconLabel name="warning">يلعب مرتين في نفس اليوم: {conflicts.join("، ")}</IconLabel>
        </p>
      )}

      {day.matches.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {day.matches.map((match) => (
            <li key={match.id} className="flex items-center gap-2 flex-wrap text-sm">
              <input
                type="time"
                value={
                  times[match.id] ?? (match.matchDate ? timeOf(new Date(match.matchDate)) : "")
                }
                onChange={(e) => setTimes((p) => ({ ...p, [match.id]: e.target.value }))}
                onBlur={(e) => {
                  const next = e.target.value;
                  if (next && match.matchDate && next !== timeOf(new Date(match.matchDate))) {
                    onRetime(match.id, next);
                  }
                }}
                disabled={busy}
                aria-label="وقت المباراة"
                className="input input-sm"
                style={{ width: "auto" }}
              />
              <span className="font-bold min-w-0">{fixtureName(match)}</span>
              {match.venue && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {match.venue}
                </span>
              )}
              {match.status === "PLAYED" && (
                <span className="badge badge-active text-xs">انتهت</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
