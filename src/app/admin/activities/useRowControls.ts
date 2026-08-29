"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import { activityRow as texts } from "@/lib/texts";

export function useRowControls(reload: () => Promise<void>) {
  const showToast = useToast();
  const [busy, setBusy] = useState(false);

  async function run(work: () => Promise<unknown>, done?: string) {
    setBusy(true);
    try {
      await work();
      await reload();
      if (done) showToast(done);
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    setPublished: (id: string, published: boolean) =>
      run(() => api.patch(`/api/admin/activities/${id}`, { published })),
    setOpen: (id: string, isOpen: boolean) =>
      run(() => api.patch(`/api/admin/activities/${id}`, { isOpen })),
    duplicate: (id: string) =>
      run(() => api.post(`/api/admin/activities/${id}/duplicate`, {}), texts.duplicated),
  };
}
