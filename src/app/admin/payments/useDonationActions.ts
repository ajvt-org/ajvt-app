"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { DonationResponse, MemberOption, Proof } from "./paymentTypes";

const CONFIRM_DELETE = "هل أنت متأكد من حذف هذا التبرع نهائياً؟ لا يمكن التراجع عن هذا الإجراء.";

export function useDonationActions({
  members,
  patch,
  remove,
}: {
  members: MemberOption[];
  patch: (id: string, changes: Partial<Proof>) => void;
  remove: (id: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id);
    try {
      await action();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return {
    busyId,

    destroy: (id: string) => {
      if (!confirm(CONFIRM_DELETE)) return;
      run(id, async () => {
        await api.del(`/api/admin/donations/${id}`);
        remove(id);
      });
    },

    review: (id: string, status: "ACTIVE" | "REJECTED") =>
      run(id, async () => {
        await api.patch(`/api/admin/donations/${id}`, { status });
        patch(id, { status });
      }),

    link: (id: string, memberId: string | null) =>
      run(id, async () => {
        const data = await api.patch<DonationResponse>(`/api/admin/donations/${id}`, { memberId });
        const linked = memberId ? members.find((m) => m.id === memberId)?.fullName : undefined;
        patch(id, { memberId, memberName: linked || data.donation.donorName || "فاعل خير" });
      }),
  };
}
