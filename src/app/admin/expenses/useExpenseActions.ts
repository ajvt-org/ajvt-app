"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";

export function useExpenseActions(reload: () => Promise<unknown>) {
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [reassignValue, setReassignValue] = useState<Record<string, string>>({});
  const [reassigningId, setReassigningId] = useState<string | null>(null);

  async function run(id: string, mark: (id: string | null) => void, call: () => Promise<unknown>) {
    mark(id);
    setError("");
    try {
      await call();
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      mark(null);
    }
  }

  function destroy(id: string) {
    setAsking(null);
    return run(id, setBusyId, () => api.del(`/api/admin/expenses/${id}`));
  }

  function reassign(id: string) {
    const method = reassignValue[id];
    if (!method) return;
    return run(id, setReassigningId, () =>
      api.patch(`/api/admin/donations/${id}`, { paymentMethod: method }),
    );
  }

  return {
    error,
    busyId,
    asking,
    ask: setAsking,
    destroy,
    reassignValue,
    reassigningId,
    choose: (id: string, method: string) => setReassignValue((p) => ({ ...p, [id]: method })),
    reassign,
  };
}
