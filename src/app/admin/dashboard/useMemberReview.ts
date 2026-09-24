"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import { nextAwaitingReview } from "@/lib/reviewQueue";
import { useReviewShortcuts } from "./useReviewShortcuts";
import type { Member } from "./types";

export function useMemberReview({
  paginated,
  reload,
  reloadQuietly,
}: {
  paginated: Member[];
  reload: () => Promise<void>;
  reloadQuietly: () => Promise<Member[]>;
}) {
  const [selected, setSelected] = useState<Member | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [proofZoom, setProofZoom] = useState(false);
  const [showRejectPicker, setShowRejectPicker] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>(REJECTION_REASONS[0]);
  const [reviewError, setReviewError] = useState("");

  function open(member: Member) {
    setSelected(member);
    setProofZoom(false);
    setShowRejectPicker(false);
  }

  function close() {
    setSelected(null);
    setProofZoom(false);
    setShowRejectPicker(false);
  }

  async function refreshSelected() {
    if (!selected) return;
    const loaded = await reloadQuietly();
    const fresh = loaded.find((m) => m.id === selected.id);
    if (fresh) setSelected(fresh);
  }

  async function validate(id: string, action: "ACTIVE" | "REJECTED", reason?: string) {
    setActionLoading(true);
    setReviewError("");
    try {
      await api.post("/api/admin/validate", {
        id,
        action,
        ...(reason ? { rejectionReason: reason } : {}),
      });
      const next = nextAwaitingReview(paginated, id, 1);
      await reload();
      setSelected(next);
      setShowRejectPicker(false);
      setProofZoom(false);
    } catch (e) {
      setReviewError(errorMessage(e));
    } finally {
      setActionLoading(false);
    }
  }

  function rename(id: string, fullName: string) {
    setSelected((prev) => (prev && prev.id === id ? { ...prev, fullName } : prev));
  }

  useReviewShortcuts({
    selected,
    paginated,
    actionLoading,
    showRejectPicker,
    setShowRejectPicker,
    setRejectReason,
    onValidate: validate,
    onClose: () => setSelected(null),
    onStep: (next) => {
      setSelected(next);
      setProofZoom(false);
    },
  });

  return {
    selected,
    actionLoading,
    proofZoom,
    setProofZoom,
    showRejectPicker,
    setShowRejectPicker,
    rejectReason,
    setRejectReason,
    reviewError,
    open,
    close,
    rename,
    refreshSelected,
    validate,
  };
}
