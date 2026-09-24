"use client";

import { useState } from "react";

export function useSelection() {
  const [ids, setIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return { ids, toggle, clear: () => setIds(new Set()) };
}
