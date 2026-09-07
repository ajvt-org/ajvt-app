"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { bulkReview as texts } from "@/lib/texts";

export interface BulkQuestion {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  run: () => Promise<void>;
}

async function settleAll(calls: Promise<unknown>[]): Promise<number> {
  const results = await Promise.allSettled(calls);
  return results.filter((result) => result.status === "rejected").length;
}

export function useBulkActions({
  selectedIds,
  onCleared,
  onDone,
}: {
  selectedIds: Set<string>;
  onCleared: () => void;
  onDone: () => Promise<void> | void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState<BulkQuestion | null>(null);

  async function run(work: () => Promise<number>, someFailed: (count: number) => string) {
    setAsking(null);
    setLoading(true);
    setError("");
    try {
      const failed = await work();
      onCleared();
      await onDone();
      if (failed > 0) setError(someFailed(failed));
    } catch {
      setError(texts.failed);
    } finally {
      setLoading(false);
    }
  }

  function review(action: "ACTIVE" | "REJECTED", reason: string | null) {
    return run(
      () =>
        settleAll(
          [...selectedIds].map((id) =>
            api.post("/api/admin/validate", {
              id,
              action,
              ...(reason ? { rejectionReason: reason } : {}),
            }),
          ),
        ),
      texts.someFailed,
    );
  }

  function moveToAge(age: string) {
    return run(
      () => settleAll([...selectedIds].map((id) => api.patch(`/api/admin/members/${id}`, { age }))),
      texts.someNotMoved,
    );
  }

  return {
    loading,
    error,
    asking,
    stopAsking: () => setAsking(null),

    askApprove: () => {
      if (selectedIds.size === 0) return;
      setAsking({
        title: texts.approveTitle,
        message: texts.approve(selectedIds.size),
        confirmLabel: texts.approveLabel,
        run: () => review("ACTIVE", null),
      });
    },

    askRefuse: (reason: string) => {
      if (selectedIds.size === 0) return;
      setAsking({
        title: texts.refuseTitle,
        message: texts.refuse(selectedIds.size, reason),
        confirmLabel: texts.refuseLabel,
        danger: true,
        run: () => review("REJECTED", reason),
      });
    },

    askMoveToAge: (age: string) => {
      if (selectedIds.size === 0 || !age) return;
      setAsking({
        title: texts.moveTitle,
        message: texts.move(selectedIds.size, age),
        confirmLabel: texts.moveLabel,
        run: () => moveToAge(age),
      });
    },
  };
}
