"use client";

import { useCallback, useEffect, useState } from "react";
import { useFreshData } from "@/hooks/useFreshData";

export interface PendingCounts {
  members: number;
  activityWork: number;
  donations: number;
}

const NONE: PendingCounts = { members: 0, activityWork: 0, donations: 0 };

export function usePendingCounts(enabled: boolean): PendingCounts {
  const [pending, setPending] = useState<PendingCounts>(NONE);

  const reload = useCallback(() => {
    if (!enabled) return;
    fetch("/api/admin/notifications/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setPending({
          members: data.pendingMembers || 0,
          activityWork: data.pendingActivityWork || 0,
          donations: data.pendingDonations || 0,
        });
      })
      .catch(() => {});
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  useFreshData(reload, enabled);

  return pending;
}
