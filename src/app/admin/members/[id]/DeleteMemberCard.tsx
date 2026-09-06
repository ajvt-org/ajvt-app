"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { api, errorMessage } from "@/lib/api";
import { deleteMember as texts } from "@/lib/texts";
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

  const consequence =
    confirming === "person"
      ? texts.personConsequence(fullName)
      : texts.paymentConsequence(fullName);

  return (
    <div className="card p-4 space-y-3" style={{ border: "1.5px solid #fecaca" }}>
      <div className="flex flex-wrap gap-2">
        <DangerButton label={texts.payment} busy={busy} onClick={() => setConfirming("payment")} />
        {userId && (
          <DangerButton label={texts.person} busy={busy} onClick={() => setConfirming("person")} />
        )}
      </div>

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}

      {confirming && (
        <ConfirmDeleteDialog
          name={fullName}
          consequence={consequence}
          loading={busy}
          onConfirm={remove}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

function DangerButton({
  label,
  busy,
  onClick,
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="btn text-sm font-bold"
      style={{ background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" }}
    >
      {busy ? "..." : <IconLabel name="trash">{label}</IconLabel>}
    </button>
  );
}
