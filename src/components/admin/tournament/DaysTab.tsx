"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";
import { formatActivityDates } from "@/lib/activityDates";
import DayCard from "./DayCard";
import { timeOf } from "@/lib/tournamentDays";
import { dayLabel, type DaysPayload } from "./daysTypes";
import { daysTab } from "@/lib/texts";

function RestInserter({ onInsert, busy }: { onInsert: () => void; busy: boolean }) {
  return (
    <div className="flex justify-center -my-1">
      <button
        onClick={onInsert}
        disabled={busy}
        className="text-xs px-3 py-1 rounded-full font-bold"
        style={{ background: "var(--cream)", color: "#b45309", border: "1px dashed #fcd34d" }}
      >
        <IconLabel name="plus">{daysTab.addRestHere}</IconLabel>
      </button>
    </div>
  );
}

export default function DaysTab({
  activityId,
  onMatchesChanged,
}: {
  activityId: string;
  onMatchesChanged: () => void;
}) {
  const showToast = useToast();
  const [data, setData] = useState<DaysPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [schedule, setSchedule] = useState<Record<string, { dayId: string; time: string }>>({});
  const [notifyFollowers, setNotifyFollowers] = useState(true);

  const reload = useCallback(() => {
    return api.get<DaysPayload>(`/api/admin/activities/${activityId}/days`).then(setData);
  }, [activityId]);

  useEffect(() => {
    reload().catch(() => showToast(daysTab.loadFailed, "error"));
  }, [reload, showToast]);

  async function run(action: () => Promise<unknown>, done?: string) {
    setBusy(true);
    try {
      await action();
      await reload();
      onMatchesChanged();
      if (done) showToast(done);
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <PageLoading />;

  if (!data.startsAt) {
    return (
      <div className="card p-6 text-center space-y-3">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          {daysTab.needStartDate}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {daysTab.countedFromStart}
        </p>
        <Link
          href={`/admin/activities/${activityId}?tab=details`}
          className="btn btn-sm btn-primary mx-auto"
        >
          <IconLabel name="calendar">{daysTab.openActivity}</IconLabel>
        </Link>
      </div>
    );
  }

  const base = `/api/admin/activities/${activityId}/days`;

  return (
    <div className="space-y-2">
      <div className="card p-3 flex items-center gap-2 flex-wrap">
        <p className="text-sm font-bold flex-1" style={{ color: "var(--text-main)" }}>
          <IconLabel name="calendar">
            {formatActivityDates({
              startsAt: data.startsAt,
              endsAt: data.endsAt,
              withTime: false,
              period: null,
            }) ?? ""}
          </IconLabel>
        </p>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {daysTab.endFromLastDay}
        </span>
        <label className="flex items-center gap-2 text-xs font-bold w-full">
          <input
            type="checkbox"
            checked={notifyFollowers}
            onChange={(e) => setNotifyFollowers(e.target.checked)}
            className="w-4 h-4"
          />
          {daysTab.notifyOnMove}
        </label>
      </div>

      {data.days.map((day, index) => (
        <div key={day.id} className="space-y-2">
          {index > 0 && (
            <RestInserter
              busy={busy}
              onInsert={() =>
                run(
                  () =>
                    api.post(base, {
                      position: day.position,
                      isRest: true,
                      notify: notifyFollowers,
                    }),
                  daysTab.restAdded,
                )
              }
            />
          )}
          <DayCard
            day={day}
            busy={busy}
            onSetRest={(isRest) =>
              run(() => api.patch(`${base}/${day.id}`, { isRest }), daysTab.dayChanged)
            }
            onRemove={() =>
              run(
                () => api.del(`${base}/${day.id}`, { notify: notifyFollowers }),
                daysTab.dayRemoved,
              )
            }
            onRetime={(matchId, time) =>
              run(
                () => api.post(`${base}/assign`, { matchId, dayId: day.id, time }),
                daysTab.timeChanged,
              )
            }
          />
        </div>
      ))}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => run(() => api.post(base, { isRest: false }), daysTab.matchDayAppended)}
          disabled={busy}
          className="btn btn-sm btn-ghost"
        >
          <IconLabel name="plus">{daysTab.addMatchDay}</IconLabel>
        </button>
        <button
          onClick={() => run(() => api.post(base, { isRest: true }), daysTab.restDayAppended)}
          disabled={busy}
          className="btn btn-sm btn-ghost"
        >
          <IconLabel name="plus">{daysTab.addRestDay}</IconLabel>
        </button>
      </div>

      {data.unscheduled.length > 0 && (
        <div className="card p-3 sm:p-4 space-y-2">
          <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            <IconLabel name="clock">{daysTab.unscheduled(data.unscheduled.length)}</IconLabel>
          </p>
          {data.unscheduled.map((match) => {
            const chosen = schedule[match.id] ?? {
              dayId: "",
              time: match.matchDate ? timeOf(new Date(match.matchDate)) : "16:00",
            };
            return (
              <div key={match.id} className="flex items-center gap-2 flex-wrap text-sm">
                <span className="font-bold min-w-0 flex-1">
                  {match.homeTeam.name} × {match.awayTeam.name}
                </span>
                <select
                  value={chosen.dayId}
                  onChange={(e) =>
                    setSchedule((p) => ({ ...p, [match.id]: { ...chosen, dayId: e.target.value } }))
                  }
                  aria-label={daysTab.pickDayLabel}
                  className="input input-sm"
                  style={{ width: "auto" }}
                >
                  <option value="">{daysTab.pickDay}</option>
                  {data.days
                    .filter((d) => !d.isRest)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {daysTab.dayOption(d.position, dayLabel(d.date))}
                      </option>
                    ))}
                </select>
                <input
                  type="time"
                  value={chosen.time}
                  onChange={(e) =>
                    setSchedule((p) => ({ ...p, [match.id]: { ...chosen, time: e.target.value } }))
                  }
                  aria-label={daysTab.matchTime}
                  className="input input-sm"
                  style={{ width: "auto" }}
                />
                <button
                  onClick={() =>
                    run(
                      () =>
                        api.post(`${base}/assign`, {
                          matchId: match.id,
                          dayId: chosen.dayId,
                          time: chosen.time,
                        }),
                      daysTab.scheduled,
                    )
                  }
                  disabled={busy || !chosen.dayId}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-40"
                  style={{ background: "var(--mint-700)", color: "white" }}
                >
                  {daysTab.schedule}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
