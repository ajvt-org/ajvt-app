"use client";

import { useEffect, useState } from "react";
import NumericRanges from "@/components/NumericRanges";
import { curvePercent, type ScoreCurve } from "@/lib/competitionConfig";

export default function QuestionTimer({ shownAt, curve }: { shownAt: string; curve: ScoreCurve }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const stamped = shownAt ? new Date(shownAt).getTime() : Number.NaN;
    const started = Number.isNaN(stamped) ? Date.now() : stamped;
    const tick = () => setElapsedMs(Math.max(0, Date.now() - started));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [shownAt]);

  const percent = Math.round(curvePercent(curve, elapsedMs));
  const left = Math.max(0, curve.maxSeconds - elapsedMs / 1000);
  const share = Math.min(1, elapsedMs / 1000 / curve.maxSeconds);
  const full = elapsedMs / 1000 <= curve.fullSeconds;
  const color = full ? "var(--mint-600)" : percent > curve.floorPercent ? "#b45309" : "#991b1b";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-bold">
        <span style={{ color }} aria-label="الوقت المتبقي">
          <NumericRanges>{`${Math.ceil(left)} ث`}</NumericRanges>
        </span>
        <span style={{ color }} aria-label="نسبة النقاط">
          <NumericRanges>{`${percent}%`}</NumericRanges>
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--mint-100)" }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={curve.floorPercent}
        aria-valuemax={100}
      >
        <div
          className="h-full transition-all"
          style={{ width: `${(1 - share) * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}
