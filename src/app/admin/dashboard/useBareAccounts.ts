"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BareAccount } from "./types";
import { useFreshDataFromElsewhere } from "@/hooks/useFreshData";

export function useBareAccounts() {
  const [users, setUsers] = useState<BareAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    return api
      .get<{ users: BareAccount[] }>("/api/admin/users")
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFreshDataFromElsewhere(refresh);

  return { users, loading, refresh };
}
