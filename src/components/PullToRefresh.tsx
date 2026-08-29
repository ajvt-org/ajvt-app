"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

const THRESHOLD = 70;
const RESISTANCE = 0.5;

export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    function start(e: TouchEvent) {
      if (busy.current || window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
    }

    function move(e: TouchEvent) {
      if (startY.current === null || busy.current) return;
      if (window.scrollY > 0) {
        startY.current = null;
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      const next = delta <= 0 ? 0 : Math.min(delta * RESISTANCE, THRESHOLD * 1.6);
      pullRef.current = next;
      setPull(next);
    }

    function end() {
      startY.current = null;
      if (pullRef.current >= THRESHOLD) {
        busy.current = true;
        setRefreshing(true);
        window.location.reload();
        return;
      }
      pullRef.current = 0;
      setPull(0);
    }

    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
  }, []);

  if (pull === 0 && !refreshing) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none"
      style={{ transform: `translateY(${Math.min(pull, THRESHOLD * 1.6)}px)` }}
    >
      <span
        className="mt-2 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: "#fff",
          color: "var(--mint-700)",
          boxShadow: "0 2px 10px rgba(26, 63, 51, 0.18)",
          opacity: Math.min(pull / THRESHOLD, 1),
        }}
      >
        <Icon name="refresh" size={18} className={refreshing ? "animate-spin" : undefined} />
      </span>
    </div>
  );
}
