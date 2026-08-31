"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import type { FinanceTag } from "@/components/admin/FinanceTagChips";
import { readActivities, readFinanceTags, readMembers, readProofs } from "./paymentsResponse";
import type { ActivityOption, MemberOption, Proof } from "./paymentTypes";

interface Loaded {
  proofs: Proof[];
  members: MemberOption[];
  activities: ActivityOption[];
  tags: FinanceTag[];
}

const EMPTY: Loaded = { proofs: [], members: [], activities: [], tags: [] };

function readJson(url: string): Promise<unknown> {
  return fetch(url)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
}

export function usePaymentsData() {
  const router = useRouter();
  const [data, setData] = useState<Loaded>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/payment-proofs").then((r): Promise<unknown> => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return Promise.resolve(null);
        }
        return r.json();
      }),
      readJson("/api/admin/members"),
      readJson("/api/admin/finance-tags"),
      readJson("/api/admin/activities"),
    ])
      .then(([proofsData, membersData, tagsData, activitiesData]) =>
        setData({
          proofs: readProofs(proofsData),
          members: readMembers(membersData),
          tags: readFinanceTags(tagsData),
          activities: readActivities(activitiesData),
        }),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...data,
    loading,
    setProofs: (fn: (prev: Proof[]) => Proof[]) => setData((p) => ({ ...p, proofs: fn(p.proofs) })),
  };
}
