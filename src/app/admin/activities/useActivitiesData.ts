"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { loginPathWithNext } from "@/lib/utils";
import type { AttentionRow } from "@/lib/activityAttention";
import type { Activity } from "./activityTypes";

export function useActivitiesData() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [waiting, setWaiting] = useState<AttentionRow[]>([]);
  const [loading, setLoading] = useState(true);

  function loadActivities() {
    return api
      .get<{ activities: Activity[] }>("/api/admin/activities")
      .then((data) => setActivities(data.activities ?? []));
  }

  function loadWaiting() {
    return api
      .get<{ waiting: AttentionRow[] }>("/api/admin/activities/attention")
      .then((data) => setWaiting(data.waiting ?? []))
      .catch(() => setWaiting([]));
  }

  function loadAll(): Promise<void> {
    return Promise.all([loadActivities(), loadWaiting()])
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
        }
      })
      .then(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { activities, waiting, loading, reload: loadAll };
}
