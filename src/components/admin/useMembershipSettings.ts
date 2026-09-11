"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { runningYear } from "@/lib/membershipYear";
import type { ScopedSettings } from "@/lib/adminSettings";

export function useMembershipSettings() {
  const [fee, setFee] = useState(MEMBERSHIP_FEE);
  const [year, setYear] = useState(runningYear());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get<{ settings: ScopedSettings }>("/api/admin/settings")
      .then(({ settings }) => {
        setFee(settings.membershipFee);
        setYear(settings.membershipYear);
        setLoaded(true);
      })
      .catch(() => {});
  }, []);

  return { fee, year, loaded, configuredFee: loaded ? fee : null };
}
