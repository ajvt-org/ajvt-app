"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import type { FinanceTagRow } from "@/components/admin/FinanceTagManager";
import type { DestinationOption } from "@/lib/moneyDestination";
import type { Expense, FinanceSummary } from "./types";

export function useExpensesData() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tags, setTags] = useState<FinanceTagRow[]>([]);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    return Promise.all([
      fetch("/api/admin/finance/summary").then((r) => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        return r.ok ? r.json() : null;
      }),
      fetch("/api/admin/expenses").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/finance-tags").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/finance/destinations").then((r) => (r.ok ? r.json() : null)),
    ]).then(([summaryData, expensesData, tagsData, destinationsData]) => {
      if (summaryData) setSummary(summaryData);
      if (expensesData?.expenses) setExpenses(expensesData.expenses);
      if (tagsData?.tags) setTags(tagsData.tags);
      if (destinationsData?.destinations) setDestinations(destinationsData.destinations);
    });
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role) setRole(data.role);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { role, summary, expenses, tags, destinations, loading, reload: load };
}
