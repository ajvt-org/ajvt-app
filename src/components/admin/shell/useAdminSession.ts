"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import { usePendingCounts } from "./usePendingCounts";

export type { PendingCounts } from "./usePendingCounts";

export function useAdminSession(enabled: boolean) {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const pending = usePendingCounts(enabled);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { role, pending };
}
