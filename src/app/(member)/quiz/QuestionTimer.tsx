"use client";

import { useEffect, useRef, useState } from "react";
import NumericRanges from "@/components/NumericRanges";
import { curvePercent, type ScoreCurve } from "@/lib/competitionConfig";
import { QUESTION_THEME } from "./questionTheme";

export default function QuestionTimer({
  shownAt,
  curve,
  onExpire,
}: {
  shownAt: string;
  curve: ScoreCurve;
  onExpire?: () => void;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    const stamped = shownAt ? new Date(shownAt).getTime() : Number.NaN;
    const started = Number.isNaN(stamped) ? Date.now() : stamped;
    const tick = () => {
      const spent = Math.max(0, Date.now() - started);
      setElapsedMs(spent);
      if (spent >= curve.maxSeconds * 1000 && !fired.current) {
        fired.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownAt, curve.maxSeconds]);

  const theme = QUESTION_THEME.timer;
  const percent = Math.round(curvePercent(curve, elapsedMs));
  const left = Math.max(0, curve.maxSeconds - elapsedMs / 1000);
  const share = Math.min(1, elapsedMs / 1000 / curve.maxSeconds);
  const full = elapsedMs / 1000 <= curve.fullSeconds;
  const color = full ? theme.full : percent > curve.floorPercent ? theme.falling : theme.floor;

  if (theme.ring) {
    const dash = (1 - share) * 346;
    return (
      <div className="flex flex-col items-center gap-2.5">
        <div className="relative" style={{ width: 128, height: 128 }}>
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="55" fill="#ffffff" />
            <circle cx="64" cy="64" r="55" fill="none" stroke={theme.track} strokeWidth="10" />
            <circle
              cx="64"
              cy="64"
              r="55"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} 346`}
              transform="rotate(-90 64 64)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-black leading-none"
              style={{ fontSize: 34, color: "var(--text-main)" }}
              aria-label="الوقت المتبقي"
            >
              <NumericRanges>{`${Math.ceil(left)}`}</NumericRanges>
            </span>
            <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
              ثوانٍ
            </span>
          </div>
        </div>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          aria-label="نسبة النقاط"
        >
          <NumericRanges>{`النقاط الآن ${percent}%`}</NumericRanges>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span
        className="font-black shrink-0"
        style={{ fontSize: 20, color: "#ffffff" }}
        aria-label="الوقت المتبقي"
      >
        <NumericRanges>{`${Math.ceil(left)} ث`}</NumericRanges>
      </span>
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ background: theme.track }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={curve.floorPercent}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(1 - share) * 100}%`,
            background: color,
            boxShadow: theme.glow ? `0 0 12px ${color}` : undefined,
          }}
        />
      </div>
      <span
        className="text-xs font-extrabold px-2.5 py-0.5 rounded-full shrink-0"
        style={{ background: "rgba(255,255,255,0.12)", color: "var(--mint-100)" }}
        aria-label="نسبة النقاط"
      >
        <NumericRanges>{`${percent}%`}</NumericRanges>
      </span>
    </div>
  );
}
