"use client";

import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

export function useInactivityLogout(timeoutMs: number, onTimeout: () => void, enabled: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useRef(onTimeout);

  useEffect(() => {
    callback.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return;

    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => callback.current(), timeoutMs);
    }

    reset();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [enabled, timeoutMs]);
}
