import { useEffect } from "react";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import type { Member } from "./types";

function typingInField(): boolean {
  const tag = (document.activeElement?.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

export function useReviewShortcuts({
  selected,
  paginated,
  actionLoading,
  showRejectPicker,
  setShowRejectPicker,
  setRejectReason,
  onValidate,
  onClose,
  onStep,
}: {
  selected: Member | null;
  paginated: Member[];
  actionLoading: boolean;
  showRejectPicker: boolean;
  setShowRejectPicker: (open: boolean) => void;
  setRejectReason: (reason: string) => void;
  onValidate: (id: string, action: "ACTIVE" | "REJECTED", reason?: string) => void;
  onClose: () => void;
  onStep: (next: Member) => void;
}) {
  useEffect(() => {
    function step(delta: number) {
      if (!selected) return;
      const idx = paginated.findIndex((m) => m.id === selected.id);
      if (idx === -1 || idx + delta < 0) return;
      const next = paginated[idx + delta];
      if (next) onStep(next);
    }

    function pickReason(key: string): boolean {
      const idx = Number(key) - 1;
      if (!Number.isInteger(idx) || idx < 0 || idx >= REJECTION_REASONS.length) return false;
      setRejectReason(REJECTION_REASONS[idx]);
      onValidate(selected!.id, "REJECTED", REJECTION_REASONS[idx]);
      return true;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (!selected || actionLoading || typingInField()) return;

      if (showRejectPicker) {
        if (e.key === "Escape") setShowRejectPicker(false);
        else if (pickReason(e.key)) e.preventDefault();
        return;
      }

      const key = e.key.toLowerCase();
      if (e.key === "Escape") {
        onClose();
      } else if (key === "a" && selected.status === "PENDING") {
        e.preventDefault();
        onValidate(selected.id, "ACTIVE");
      } else if (key === "r" && selected.status !== "REJECTED") {
        e.preventDefault();
        setShowRejectPicker(true);
      } else if (key === "n" || e.key === "ArrowDown") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        step(-1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, showRejectPicker, actionLoading, paginated]);
}
