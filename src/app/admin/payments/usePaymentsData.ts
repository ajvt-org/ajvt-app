"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import type { FinanceTag } from "@/components/admin/FinanceTagChips";
import type { ActivityOption, MemberOption, Proof } from "./paymentTypes";

type MemberRow = Omit<MemberOption, "phone"> & { user: { phone: string | null } | null };

interface Loaded {
  proofs: Proof[];
  members: MemberOption[];
  activities: ActivityOption[];
  tags: FinanceTag[];
}

const EMPTY: Loaded = { proofs: [], members: [], activities: [], tags: [] };

function readJson(url: string) {
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
      fetch("/api/admin/payment-proofs").then((r) => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        return r.json();
      }),
      readJson("/api/admin/members"),
      readJson("/api/admin/finance-tags"),
      readJson("/api/admin/activities"),
    ])
      .then(([proofsData, membersData, tagsData, activitiesData]) =>
        setData({
          proofs: proofsData?.proofs ?? [],
          tags: tagsData?.tags ?? [],
          members: (membersData?.members ?? []).map((m: MemberRow) => ({
            id: m.id,
            userId: m.userId,
            fullName: m.fullName,
            memberNumber: m.memberNumber,
            phone: m.user?.phone ?? null,
            village: m.village,
            age: m.age,
            photo: m.photo,
          })),
          activities: (activitiesData?.activities ?? []).map((a: ActivityOption) => ({
            id: a.id,
            title: a.title,
          })),
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
