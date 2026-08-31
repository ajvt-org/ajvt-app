"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { money } from "@/lib/messages";
import { donationActions } from "@/lib/texts";
import { linkedAccount } from "@/lib/linkedAccount";
import type { DonationResponse, MemberOption, Proof } from "./paymentTypes";

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
      if (!confirm(donationActions.confirmRemove)) return;
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

    link: (id: string, userId: string | null) =>
      run(id, async () => {
        const { donation } = await api.patch<DonationResponse>(`/api/admin/donations/${id}`, {
          userId,
        });
        const account = linkedAccount(members, userId);
        patch(id, {
          memberId: donation.memberId,
          userId: donation.userId,
          memberName: account?.fullName || donation.donorName || money.anonymousDonor,
        });
      }),
  };
}
