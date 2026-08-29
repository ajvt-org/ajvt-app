"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { activityRow as texts } from "@/lib/texts";

export function useActivityBulk(reload: () => Promise<void>) {
  const showToast = useToast();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setPicked((held) => {
      const next = new Set(held);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clear() {
    setPicked(new Set());
  }

  async function run(work: (id: string) => Promise<unknown>) {
    if (picked.size === 0) return;
    setBusy(true);
    try {
      const results = await Promise.allSettled(Array.from(picked).map(work));
      const failed = results.filter((r) => r.status === "rejected").length;
      clear();
      await reload();
      if (failed > 0) showToast(texts.bulkFailed(failed), "error");
    } finally {
      setBusy(false);
    }
  }

  return {
    picked,
    busy,
    toggle,
    clear,
    closeRegistration: () =>
      run((id) => api.patch(`/api/admin/activities/${id}`, { isOpen: false })),
    remove: () => run((id) => api.del(`/api/admin/activities/${id}`)),
  };
}
