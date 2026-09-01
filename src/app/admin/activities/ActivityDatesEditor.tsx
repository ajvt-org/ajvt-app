"use client";

import { useId, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { formatActivityDates } from "@/lib/activityDates";
import IconLabel from "@/components/IconLabel";
import { activityDatesEditor as texts } from "@/lib/texts";

function dayValue(value: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function timeValue(value: string | null): string {
  return value ? new Date(value).toISOString().slice(11, 16) : "";
}

function toIso(day: string, time: string, withTime: boolean): string | null {
  if (!day) return null;
  return `${day}T${withTime && time ? time : "00:00"}:00.000Z`;
}

export default function ActivityDatesEditor({
  activity,
  onSaved,
}: {
  activity: {
    id: string;
    period: string | null;
    startsAt: string | null;
    endsAt: string | null;
    withTime: boolean;
  };
  onSaved: () => void;
}) {
  const uid = useId();
  const [startDay, setStartDay] = useState(dayValue(activity.startsAt));
  const [endDay, setEndDay] = useState(dayValue(activity.endsAt));
  const [withTime, setWithTime] = useState(activity.withTime);
  const [startTime, setStartTime] = useState(timeValue(activity.startsAt) || "16:00");
  const [endTime, setEndTime] = useState(timeValue(activity.endsAt) || "18:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const preview = formatActivityDates({
    startsAt: toIso(startDay, startTime, withTime),
    endsAt: toIso(endDay, endTime, withTime),
    withTime,
    period: activity.period,
  });

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/api/admin/activities/${activity.id}`, {
        startsAt: toIso(startDay, startTime, withTime),
        endsAt: toIso(endDay, endTime, withTime),
        withTime,
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {activity.period && !startDay && (
        <p className="text-xs" style={{ color: "#92400e" }}>
          {texts.legacyPeriod(activity.period)}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <label
          htmlFor={`${uid}-from`}
          className="text-xs shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          {texts.from}
        </label>
        <input
          id={`${uid}-from`}
          type="date"
          value={startDay}
          onChange={(e) => setStartDay(e.target.value)}
          className="input text-sm flex-1 min-w-0"
        />
        <label
          htmlFor={`${uid}-to`}
          className="text-xs shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          {texts.to}
        </label>
        <input
          id={`${uid}-to`}
          type="date"
          value={endDay}
          min={startDay || undefined}
          onChange={(e) => setEndDay(e.target.value)}
          className="input text-sm flex-1 min-w-0"
        />
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" checked={withTime} onChange={(e) => setWithTime(e.target.checked)} />
        {texts.withTime}
      </label>

      {withTime && (
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input text-sm"
            dir="ltr"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="input text-sm"
            dir="ltr"
          />
        </div>
      )}

      {preview && (
        <p className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
          {texts.preview(preview)}
        </p>
      )}
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="text-xs px-3 py-2 rounded-lg font-bold"
        style={{ background: "var(--mint-600)", color: "white" }}
      >
        {saving ? "..." : <IconLabel name="save">{texts.save}</IconLabel>}
      </button>
    </div>
  );
}
