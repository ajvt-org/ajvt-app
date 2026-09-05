"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function useOpenTeam(autoOpen: string[]) {
  const key = autoOpen.join(",");
  const [picked, setPicked] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [seen, setSeen] = useState(key);
  const anchor = useRef<{ element: HTMLElement; top: number } | null>(null);

  if (seen !== key) {
    setSeen(key);
    setCollapsed([]);
  }

  useLayoutEffect(() => {
    const held = anchor.current;
    if (!held) return;
    anchor.current = null;
    const shift = held.element.getBoundingClientRect().top - held.top;
    if (shift) window.scrollBy({ top: shift, behavior: "instant" });
  });

  function isOpen(teamId: string): boolean {
    return autoOpen.includes(teamId) ? !collapsed.includes(teamId) : picked === teamId;
  }

  function toggle(teamId: string, summary?: HTMLElement | null) {
    if (summary) anchor.current = { element: summary, top: summary.getBoundingClientRect().top };
    if (autoOpen.includes(teamId)) {
      setCollapsed((ids) =>
        ids.includes(teamId) ? ids.filter((id) => id !== teamId) : [...ids, teamId],
      );
      return;
    }
    setPicked((current) => (current === teamId ? null : teamId));
  }

  return { isOpen, toggle };
}
