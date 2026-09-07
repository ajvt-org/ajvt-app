"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { DonationResponse, Proof } from "./paymentTypes";

export function useDonationActions({
  patch,
  remove,
}: {
  patch: (id: string, changes: Partial<Proof>) => void;
  remove: (id: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null);

  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id);
    setFailure(null);
    try {
      await action();
    } catch (e) {
      setFailure({ id, message: errorMessage(e) });
    } finally {
      setBusyId(null);
    }
  }

  return {
    busyId,

    errorOn: (id: string) => (failure?.id === id ? failure.message : ""),

    destroy: (id: string) =>
      run(id, async () => {
        await api.del(`/api/admin/donations/${id}`);
        remove(id);
      }),

    review: (id: string, status: "ACTIVE" | "REJECTED") =>
      run(id, async () => {
        await api.patch(`/api/admin/donations/${id}`, { status });
        patch(id, { status });
      }),

    link: (id: string, userId: string | null) =>
      run(id, async () => {
        const { donation } = await api.patch<DonationResponse>(`/api/admin/donations/${id}`, {
          userId,
        });
        patch(id, {
          memberId: donation.memberId,
          userId: donation.userId,
          memberName: donation.memberName,
          donorName: donation.donorName ?? null,
        });
      }),
  };
}
