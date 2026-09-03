"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

const openMenus = new Set<() => void>();

export function useRowMenu(
  box: RefObject<HTMLElement | null>,
  trigger: RefObject<HTMLButtonElement | null>,
) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    openMenus.add(close);

    function away(event: Event) {
      if (!box.current?.contains(event.target as Node)) close();
    }

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      close();
      trigger.current?.focus();
    }

    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", onKey);
    return () => {
      openMenus.delete(close);
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, box, trigger]);

  function toggle() {
    if (open) {
      close();
      return;
    }
    for (const other of [...openMenus]) other();
    setOpen(true);
  }

  return { open, toggle, close };
}
