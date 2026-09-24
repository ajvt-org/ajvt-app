"use client";

import { useMemo } from "react";
import StatsPanel from "./StatsPanel";
import { ageBreakdown, paymentBreakdown, signupsByDay, villageBreakdown } from "./memberStats";
import type { Member } from "./types";

export default function MemberStats({ members }: { members: Member[] }) {
  const byAge = useMemo(() => ageBreakdown(members), [members]);
  const byVillage = useMemo(() => villageBreakdown(members), [members]);
  const byPayment = useMemo(() => paymentBreakdown(members), [members]);
  const signups = useMemo(() => signupsByDay(members), [members]);

  return <StatsPanel signups={signups} byAge={byAge} byVillage={byVillage} byPayment={byPayment} />;
}
