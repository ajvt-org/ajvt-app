"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";

export interface PendingCounts {
  members: number;
  teamRequests: number;
  donations: number;
}

const NONE: PendingCounts = { members: 0, teamRequests: 0, donations: 0 };

export function useAdminSession(enabled: boolean) {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingCounts>(NONE);

  useEffect(() => {
    if (!enabled) return;
    fetch("/api/admin/me")
      .then((r) => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.role) setRole(data.role);
      })
      .catch(() => {});
    fetch("/api/admin/notifications/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setPending({
          members: data.pendingMembers || 0,
          teamRequests: data.pendingTeamRequests || 0,
          donations: data.pendingDonations || 0,
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { role, pending };
}
