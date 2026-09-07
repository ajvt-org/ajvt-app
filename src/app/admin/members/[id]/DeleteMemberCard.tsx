"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { api, errorMessage } from "@/lib/api";
import { deleteMember as texts } from "@/lib/texts";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";

export default function DeleteMemberCard({
  userId,
  fullName,
}: {
  userId: string | null;
  fullName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  if (!userId) return null;

  async function remove(confirmName: string) {
    setBusy(true);
    setError("");
    try {
      await api.del(`/api/admin/users/${userId}`, { confirmName });
      router.push("/admin/dashboard");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="card p-4 space-y-3" style={{ border: "1.5px solid #fecaca" }}>
      <button
        onClick={() => setConfirming(true)}
        disabled={busy}
        className="btn text-sm font-bold"
        style={{ background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" }}
      >
        {busy ? "..." : <IconLabel name="trash">{texts.person}</IconLabel>}
      </button>

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}

      {confirming && (
        <ConfirmDeleteDialog
          name={fullName}
          consequence={texts.personConsequence(fullName)}
          loading={busy}
          onConfirm={remove}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
