"use client";

import { useEffect, useRef, useState } from "react";
import NumericRanges from "@/components/NumericRanges";
import { countedNoun, DAYS } from "@/lib/arabicPlural";

export default function NextRoundCountdown({
  opensAt,
  onReached,
  color = "var(--mint-700)",
  compact = false,
  ariaLabel = "الوقت المتبقي للجولة القادمة",
}: {
  opensAt: string;
  onReached?: () => void;
  color?: string;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const [leftMs, setLeftMs] = useState(() => new Date(opensAt).getTime() - Date.now());
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    const target = new Date(opensAt).getTime();
    const tick = () => {
      const left = target - Date.now();
      setLeftMs(left);
      if (left <= 0 && !fired.current) {
        fired.current = true;
        onReached?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opensAt]);

  const total = Math.max(0, Math.floor(leftMs / 1000));
  const days = Math.floor(total / 86_400);
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(Math.floor((total % 86_400) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;

  return (
    <span
      className={compact ? "text-xs font-black" : "block text-3xl font-black mt-1"}
      style={{
        color,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: compact ? undefined : "2px",
      }}
      aria-label={ariaLabel}
    >
      <NumericRanges>{days > 0 ? `${countedNoun(days, DAYS)} و ${clock}` : clock}</NumericRanges>
    </span>
  );
}
