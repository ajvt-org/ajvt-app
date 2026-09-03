"use client";

import { useState } from "react";

export function useOpenTeam(autoOpen: string[]) {
  const key = autoOpen.join(",");
  const [picked, setPicked] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [seen, setSeen] = useState(key);

  if (seen !== key) {
    setSeen(key);
    setCollapsed([]);
  }

  function isOpen(teamId: string): boolean {
    return autoOpen.includes(teamId) ? !collapsed.includes(teamId) : picked === teamId;
  }

  function toggle(teamId: string) {
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
