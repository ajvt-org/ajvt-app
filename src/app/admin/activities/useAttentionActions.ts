"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import type { AttentionRow, AttentionSettle } from "@/lib/activityAttention";
import { activityAttention as texts } from "@/lib/texts";

function decide(activityId: string, settle: AttentionSettle, accept: boolean) {
  if (settle.target === "teamMember") {
    const path = `/api/admin/teams/${settle.teamId}/members/${settle.userId}`;
    return accept ? api.patch(path, {}) : api.del(path);
  }
  return api.patch(`/api/admin/activities/${activityId}/register`, {
    registrationId: settle.registrationId,
    status: accept ? "ACTIVE" : "REJECTED",
  });
}

export function useAttentionActions(reload: () => Promise<void>) {
  const showToast = useToast();
  const [busy, setBusy] = useState("");

  async function settle(row: AttentionRow, accept: boolean) {
    if (!row.settle || busy) return;
    setBusy(row.id);
    try {
      await decide(row.activityId, row.settle, accept);
      await reload();
      showToast(accept ? texts.accepted : texts.refused);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy("");
    }
  }

  return { busy, settle };
}
