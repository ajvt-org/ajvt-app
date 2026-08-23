"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { api, errorMessage } from "@/lib/api";
import { RETENTION_DAYS } from "@/lib/deletedRecords";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";

export default function DeleteMemberCard({
  memberId,
  fullName,
}: {
  memberId: string;
  fullName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function remove(confirmName: string) {
    setBusy(true);
    setError("");
    try {
      await api.del(`/api/admin/members/${memberId}`, { confirmName });
      router.push("/admin/dashboard");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="card p-4 space-y-2" style={{ border: "1.5px solid #fecaca" }}>
      <p className="text-sm font-black" style={{ color: "#991b1b" }}>
        <IconLabel name="warning">حذف نهائي</IconLabel>
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        يحذف الطلب وكل بياناته، ويمكن استرجاعه خلال {RETENTION_DAYS} يوماً قبل أن يُمحى نهائياً.
      </p>
      <button
        onClick={() => setConfirming(true)}
        disabled={busy}
        className="btn text-sm font-bold"
        style={{ background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" }}
      >
        {busy ? "..." : <IconLabel name="trash">حذف الطلب نهائياً</IconLabel>}
      </button>
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}
      {confirming && (
        <ConfirmDeleteDialog
          name={fullName}
          loading={busy}
          onConfirm={remove}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
