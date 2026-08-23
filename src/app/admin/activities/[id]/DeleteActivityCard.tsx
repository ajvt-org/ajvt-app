"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import IconLabel from "@/components/IconLabel";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export default function DeleteActivityCard({ activityId }: { activityId: string }) {
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
    <div className="card p-4 space-y-2" style={{ border: "1.5px solid #fecaca" }}>
      <p className="text-sm font-black" style={{ color: "#991b1b" }}>
        <IconLabel name="warning">حذف النشاط</IconLabel>
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        يحذف النشاط ويلغي تسجيل جميع الأعضاء فيه.
      </p>
      <button
        onClick={() => setConfirming(true)}
        disabled={busy}
        className="btn text-sm font-bold"
        style={{ background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" }}
      >
        {busy ? "..." : <IconLabel name="trash">حذف النشاط نهائياً</IconLabel>}
      </button>
      {confirming && (
        <ConfirmDialog
          title="حذف النشاط"
          message="هل أنت متأكد من حذف هذا النشاط؟ سيتم إلغاء تسجيل جميع الأعضاء فيه."
          confirmLabel="حذف نهائي"
          danger
          loading={busy}
          onConfirm={remove}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
