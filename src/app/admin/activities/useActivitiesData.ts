"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import type { Activity } from "./activityTypes";

export function useActivitiesData() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  function loadAll() {
    return fetch("/api/admin/activities")
      .then((activitiesRes) => {
        if (activitiesRes.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        return activitiesRes.json();
      })
      .then((activitiesData) => {
        if (!activitiesData) return;
        interface RawRegistration {
          member: { user?: { phone: string } | null } & Record<string, unknown>;
        }
        setActivities(
          (activitiesData.activities || []).map(
            (a: { registrations: RawRegistration[] } & Record<string, unknown>) => ({
              ...a,
              registrations: a.registrations.map(({ member, ...r }) => ({
                ...r,
                member: { ...member, phone: member.user?.phone ?? null },
              })),
            }),
          ),
        );
      })
      .catch(() => {
        router.push(loginPathWithNext("/admin/login"));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { activities, loading, reload: loadAll };
}
