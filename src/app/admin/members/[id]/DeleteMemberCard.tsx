"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { api, errorMessage } from "@/lib/api";
import { RETENTION_DAYS } from "@/lib/deletedRecords";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";

type Target = "payment" | "person";

export default function DeleteMemberCard({
  memberId,
  userId,
  fullName,
}: {
  memberId: string;
  userId: string | null;
  fullName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<Target | null>(null);
  const [error, setError] = useState("");

  async function remove(confirmName: string) {
    const path =
      confirming === "person" ? `/api/admin/users/${userId}` : `/api/admin/members/${memberId}`;
    setBusy(true);
    setError("");
    try {
      await api.del(path, { confirmName });
      router.push("/admin/dashboard");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
      setConfirming(null);
    }
  }

  return (
    <div className="card p-4 space-y-3" style={{ border: "1.5px solid #fecaca" }}>
      <p className="text-sm font-black" style={{ color: "#991b1b" }}>
        <IconLabel name="warning">حذف نهائي</IconLabel>
      </p>

      <DangerAction
        note="يحذف الدفع وحده. يبقى الحساب والشخص وبياناته كما هي، ويمكنه إرسال دفع جديد."
        label="حذف الدفع نهائياً"
        busy={busy}
        onClick={() => setConfirming("payment")}
      />

      {userId && (
        <DangerAction
          note={`يحذف الشخص بالكامل: حسابه ودفعه وكل ما يتعلق بهما. يمكن استرجاعه خلال ${RETENTION_DAYS} يوماً.`}
          label="حذف الشخص نهائياً"
          busy={busy}
          onClick={() => setConfirming("person")}
        />
      )}

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
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

function DangerAction({
  note,
  label,
  busy,
  onClick,
}: {
  note: string;
  label: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {note}
      </p>
      <button
        onClick={onClick}
        disabled={busy}
        className="btn text-sm font-bold"
        style={{ background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" }}
      >
        {busy ? "..." : <IconLabel name="trash">{label}</IconLabel>}
      </button>
    </div>
  );
}
