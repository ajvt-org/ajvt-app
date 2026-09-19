"use client";

import { useEffect, useRef } from "react";
import { onDataChange } from "@/lib/dataChanged";

function hidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function useReloadOnChange(reload: () => void, enabled: boolean, ownTabToo: boolean) {
  const latest = useRef(reload);

  useEffect(() => {
    latest.current = reload;
  });

  useEffect(() => {
    if (!enabled) return;
    let behind = false;

    const catchUp = () => {
      behind = false;
      latest.current();
    };

    const noteChange = (fromAnotherTab: boolean) => {
      if (!fromAnotherTab && !ownTabToo) return;
      if (hidden()) behind = true;
      else catchUp();
    };

    const onVisible = () => {
      if (!hidden() && behind) catchUp();
    };

    const stop = onDataChange(noteChange);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [enabled, ownTabToo]);
}

export function useFreshData(reload: () => void, enabled = true) {
  useReloadOnChange(reload, enabled, true);
}

export function useFreshDataFromElsewhere(reload: () => void, enabled = true) {
  useReloadOnChange(reload, enabled, false);
}
