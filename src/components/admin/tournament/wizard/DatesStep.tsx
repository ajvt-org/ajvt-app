"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { setupWizard as texts } from "@/lib/texts";

interface DatesStepProps {
  startsAt: string;
  times: string[];
  venue: string;
  dayCount: number;
  onStartsAt: (value: string) => void;
  onTimes: (times: string[]) => void;
  onVenue: (venue: string) => void;
}

const MAX_TIMES = 6;

export default function DatesStep({
  startsAt,
  times,
  venue,
  dayCount,
  onStartsAt,
  onTimes,
  onVenue,
}: DatesStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="wizard-start" className="block text-sm font-bold mb-1.5">
          {texts.firstDay}
        </label>
        <input
          id="wizard-start"
          type="date"
          value={startsAt}
          onChange={(e) => onStartsAt(e.target.value)}
          className="input"
        />
      </div>

      <div>
        <p className="block text-sm font-bold mb-1.5">{texts.matchTimes}</p>
        <div className="space-y-1.5">
          {times.map((time, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="time"
                value={time}
                onChange={(e) => onTimes(times.map((t, i) => (i === index ? e.target.value : t)))}
                aria-label={`${texts.matchTimes} ${index + 1}`}
                className="input input-sm"
                style={{ width: "auto" }}
              />
              {times.length > 1 && (
                <button
                  type="button"
                  onClick={() => onTimes(times.filter((_, i) => i !== index))}
                  aria-label={texts.removeTime}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        {times.length < MAX_TIMES && (
          <button
            type="button"
            onClick={() => onTimes([...times, "18:00"])}
            className="text-xs font-bold mt-1.5"
            style={{ color: "var(--mint-700)" }}
          >
            <IconLabel name="plus">{texts.addTime}</IconLabel>
          </button>
        )}
      </div>

      <div>
        <label htmlFor="wizard-venue" className="block text-sm font-bold mb-1.5">
          {texts.venue}
        </label>
        <input
          id="wizard-venue"
          value={venue}
          onChange={(e) => onVenue(e.target.value)}
          maxLength={60}
          placeholder={texts.venueOptional}
          className="input"
        />
      </div>

      {dayCount > 0 && (
        <div className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
          <p>
            <IconLabel name="calendar">{texts.lastDay(dayCount)}</IconLabel>
          </p>
          <p>{texts.backToBackDays}</p>
        </div>
      )}

      <p
        className="p-3 rounded-xl text-xs font-semibold"
        style={{ background: "var(--mint-100)", color: "var(--text-main)" }}
      >
        <IconLabel name="warning">{texts.replaceWarning}</IconLabel>
      </p>
    </div>
  );
}
