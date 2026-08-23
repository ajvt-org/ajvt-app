"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import { useRegistrationActions } from "./useRegistrationActions";
import type { Activity, NewActivityDraft } from "./activityTypes";

export function useActivityActions(activities: Activity[], reload: () => Promise<void>) {
  const router = useRouter();
  const showToast = useToast();
  const registrations = useRegistrationActions(reload);
  const [actionLoading, setActionLoading] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function createActivity(draft: NewActivityDraft) {
    setActionLoading(true);
    try {
      const data = await api.post<{ activity: Activity }>("/api/admin/activities", draft);
      const created = data.activity;
      if (created?.isTournament) {
        router.push(`/admin/tournament/${created.id}?title=${encodeURIComponent(created.title)}`);
        return;
      }
      await reload();
    } finally {
      setActionLoading(false);
    }
  }

  async function updateActivityPhoto(id: string, photo: string) {
    await api.patch(`/api/admin/activities/${id}`, { photo });
    await reload();
  }

  async function toggleActivityTournament(activity: Activity) {
    setActionLoading(true);
    try {
      await api.patch(`/api/admin/activities/${activity.id}`, {
        isTournament: !activity.isTournament,
      });
      await reload();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleActivityOpen(activity: Activity) {
    setActionLoading(true);
    try {
      await api.patch(`/api/admin/activities/${activity.id}`, { isOpen: !activity.isOpen });
      await reload();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function moveActivity(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activities.length) return;
    const a = activities[index];
    const b = activities[targetIndex];
    setReorderLoading(true);
    try {
      await Promise.all([
        api.patch(`/api/admin/activities/${a.id}`, { order: b.order }),
        api.patch(`/api/admin/activities/${b.id}`, { order: a.order }),
      ]);
      await reload();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setReorderLoading(false);
    }
  }

  async function saveWhatsappLink(id: string, link: string): Promise<boolean> {
    setActionLoading(true);
    try {
      await api.patch(`/api/admin/activities/${id}`, { whatsappLink: link.trim() });
      await reload();
      return true;
    } catch (e) {
      showToast(errorMessage(e), "error");
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  function requestDeleteActivity(id: string) {
    setDeletingId(id);
  }

  function cancelDeleteActivity() {
    setDeletingId(null);
  }

  async function confirmDeleteActivity() {
    const id = deletingId;
    if (!id) return;
    setActionLoading(true);
    try {
      await api.del(`/api/admin/activities/${id}`);
      await reload();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setActionLoading(false);
      setDeletingId(null);
    }
  }

  return {
    actionLoading: actionLoading || registrations.actionLoading,
    reorderLoading,
    deletingId,
    createActivity,
    updateActivityPhoto,
    toggleActivityTournament,
    toggleActivityOpen,
    moveActivity,
    saveWhatsappLink,
    requestDeleteActivity,
    cancelDeleteActivity,
    confirmDeleteActivity,
    registerMember: registrations.registerMember,
    reviewRegistration: registrations.reviewRegistration,
    unregisterMember: registrations.unregisterMember,
  };
}
