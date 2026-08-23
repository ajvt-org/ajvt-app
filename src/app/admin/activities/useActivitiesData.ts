"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import type { Activity, MemberOption } from "./activityTypes";

interface RawMember {
  id: string;
  fullName: string;
  phone: string | null;
  status: string;
  user: { phone: string } | null;
}

export function useActivitiesData() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);

  function loadAll() {
    return Promise.all([fetch("/api/admin/activities"), fetch("/api/admin/members")])
      .then(([activitiesRes, membersRes]) => {
        if (activitiesRes.status === 401 || membersRes.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        return Promise.all([activitiesRes.json(), membersRes.json()]);
      })
      .then((data) => {
        if (!data) return;
        const [activitiesData, membersData] = data;
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
        setMembers(
          (membersData.members || []).map((m: RawMember) => ({
            id: m.id,
            fullName: m.fullName,
            phone: m.user?.phone ?? null,
            status: m.status,
          })),
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

  return { activities, members, loading, reload: loadAll };
}
