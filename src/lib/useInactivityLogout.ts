"use client";

import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

// Tracks user activity and fires `onTimeout` after `timeoutMs` of silence.
// The callback is kept in a ref so re-renders of the calling component
// (state changes unrelated to activity) don't push the deadline back —
// only a listed DOM event does.
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
