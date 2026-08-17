"use client";

import { useEffect, useState } from "react";
import { remainingMs } from "@/lib/quizWindow";

export default function Countdown({
  revealedAt,
  windowSeconds,
  onExpire,
}: {
  revealedAt: string;
  windowSeconds: number;
  onExpire: () => void;
}) {
  const revealed = new Date(revealedAt);
  const [left, setLeft] = useState(() => remainingMs(revealed, new Date(), windowSeconds));

  useEffect(() => {
    const tick = setInterval(() => {
      const next = remainingMs(new Date(revealedAt), new Date(), windowSeconds);
      setLeft(next);
      if (next === 0) onExpire();
    }, 200);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedAt, windowSeconds]);

  const seconds = Math.ceil(left / 1000);
  const share = windowSeconds > 0 ? left / (windowSeconds * 1000) : 0;
  const urgent = share <= 0.34;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
          الوقت المتبقي
        </span>
        <span
          className="text-sm font-black"
          style={{ color: urgent ? "#b91c1c" : "var(--mint-700)" }}
          dir="ltr"
        >
          {seconds}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--mint-100)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${share * 100}%`,
            background: urgent ? "#dc2626" : "var(--mint-600)",
            transition: "width 200ms linear",
          }}
        />
      </div>
    </div>
  );
}
