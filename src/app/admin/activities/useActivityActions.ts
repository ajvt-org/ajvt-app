"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import type { Activity, NewActivityDraft } from "./activityTypes";

export function useActivityActions(activities: Activity[], reload: () => Promise<void>) {
  const router = useRouter();
  const showToast = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);

  async function createActivity(draft: NewActivityDraft) {
    setActionLoading(true);
    try {
      const data = await api.post<{ activity: Activity }>("/api/admin/activities", draft);
      const created = data.activity;
      if (created?.isTournament) {
        router.push(`/admin/tournament/${created.id}`);
        return;
      }
      await reload();
    } finally {
      setActionLoading(false);
    }
  }

  async function moveActivity(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activities.length) return;
    const a = activities[index];
    const b = activities[targetIndex];
    setReorderLoading(true);
    try {
      await Promise.all([
        api.patch(`/api/admin/activities/${a.id}`, { order: b.order }),
        api.patch(`/api/admin/activities/${b.id}`, { order: a.order }),
      ]);
      await reload();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setReorderLoading(false);
    }
  }

  return { actionLoading, reorderLoading, createActivity, moveActivity };
}
