"use client";

import { useEffect, useRef } from "react";

export function useStripScroll(active: string | null) {
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const current = strip.current?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!current || typeof current.scrollIntoView !== "function") return;
      current.scrollIntoView({ block: "nearest", inline: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return strip;
}
