"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Activity, NewActivityDraft } from "./activityTypes";

export function useActivityActions(reload: () => Promise<void>) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);

  async function createActivity(draft: NewActivityDraft) {
    setActionLoading(true);
    try {
      const data = await api.post<{ activity: Activity }>("/api/admin/activities", draft);
      const created = data.activity;
      if (created?.isTournament) {
        router.push(`/admin/activities/${created.id}?tab=teams`);
        return;
      }
      await reload();
    } finally {
      setActionLoading(false);
    }
  }

  return { actionLoading, createActivity };
}
