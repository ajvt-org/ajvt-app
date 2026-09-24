"use client";

import { useEffect, useRef } from "react";
import { useNow } from "@/hooks/useNow";

export default function BlockTimer({
  opensAt,
  closesAt,
  label,
  onReached,
  urgentShare = 0.8,
  now,
}: {
  opensAt: string;
  closesAt: string;
  label: string;
  onReached?: () => void;
  urgentShare?: number;
  now?: number;
}) {
  const ticked = useNow(60_000);
  const current = now ?? ticked;
  const start = new Date(opensAt).getTime();
  const end = new Date(closesAt).getTime();
  const elapsed = Math.min(1, Math.max(0, (current - start) / Math.max(1, end - start)));
  const remainingPct = 100 - Math.round(elapsed * 100);
  const urgent = elapsed > urgentShare;

  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
  }, [opensAt, closesAt]);

  useEffect(() => {
    if (elapsed >= 1 && !fired.current) {
      fired.current = true;
      onReached?.();
    }
  }, [elapsed, onReached]);

  return (
    <div
      role="progressbar"
      aria-valuenow={remainingPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="w-full overflow-hidden"
      style={{ height: 6, borderRadius: 9999, background: "var(--mint-100)" }}
    >
      <div
        className="h-full"
        style={{
          width: `${remainingPct}%`,
          borderRadius: 9999,
          background: urgent
            ? "linear-gradient(135deg, var(--copper-500), var(--copper-600))"
            : "linear-gradient(135deg, var(--mint-400), var(--mint-600))",
        }}
      />
    </div>
  );
}
