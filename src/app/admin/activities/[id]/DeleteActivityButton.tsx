"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import IconLabel from "@/components/IconLabel";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { deleteActivity as texts } from "@/lib/texts";

export default function DeleteActivityButton({ activityId }: { activityId: string }) {
  const router = useRouter();
  const showToast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await api.del(`/api/admin/activities/${activityId}`);
      router.push("/admin/activities");
    } catch (e) {
      showToast(errorMessage(e), "error");
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <button onClick={() => setConfirming(true)} disabled={busy} className="btn btn-danger btn-sm">
        {busy ? "..." : <IconLabel name="trash">{texts.action}</IconLabel>}
      </button>
      {confirming && (
        <ConfirmDialog
          title={texts.confirmTitle}
          message={texts.confirmMessage}
          confirmLabel={texts.confirmLabel}
          danger
          loading={busy}
          onConfirm={remove}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}
