"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";

export function useRegistrationActions(reload: () => Promise<void> | void) {
  const showToast = useToast();
  const [actionLoading, setActionLoading] = useState(false);

  async function registerMember(activityId: string, memberId: string): Promise<boolean> {
    setActionLoading(true);
    try {
      await api.post(`/api/admin/activities/${activityId}/register`, { memberId });
      await reload();
      return true;
    } catch (e) {
      showToast(errorMessage(e), "error");
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function reviewRegistration(
    activityId: string,
    registrationId: string,
    status: "ACTIVE" | "REJECTED",
    reason?: string,
  ): Promise<boolean> {
    setActionLoading(true);
    try {
      await api.patch(`/api/admin/activities/${activityId}/register`, {
        registrationId,
        status,
        reason,
      });
      await reload();
      return true;
    } catch (e) {
      showToast(errorMessage(e), "error");
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function unregisterMember(activityId: string, memberId: string) {
    setActionLoading(true);
    try {
      await api.del(`/api/admin/activities/${activityId}/register`, { memberId });
      await reload();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setActionLoading(false);
    }
  }

  return { actionLoading, registerMember, reviewRegistration, unregisterMember };
}
