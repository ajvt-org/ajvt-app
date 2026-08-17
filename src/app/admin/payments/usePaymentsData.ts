"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import type { FinanceTag } from "@/components/admin/FinanceTagChips";
import type { MemberOption, Proof } from "./paymentTypes";

interface Loaded {
  proofs: Proof[];
  members: MemberOption[];
  tags: FinanceTag[];
}

const EMPTY: Loaded = { proofs: [], members: [], tags: [] };

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
    ])
      .then(([proofsData, membersData, tagsData]) =>
        setData({
          proofs: proofsData?.proofs ?? [],
          tags: tagsData?.tags ?? [],
          members: (membersData?.members ?? []).map((m: MemberOption) => ({
            id: m.id,
            fullName: m.fullName,
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
