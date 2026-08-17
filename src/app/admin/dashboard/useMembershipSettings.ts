"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { runningYear } from "@/lib/membershipYear";
import type { AppSettingsValues } from "@/lib/settings";

export function useMembershipSettings() {
  const [fee, setFee] = useState(MEMBERSHIP_FEE);
  const [year, setYear] = useState(runningYear());

  useEffect(() => {
    api
      .get<{ settings: AppSettingsValues }>("/api/settings")
      .then(({ settings }) => {
        setFee(settings.membershipFee);
        setYear(settings.membershipYear);
      })
      .catch(() => {});
  }, []);

  return { fee, year };
}
