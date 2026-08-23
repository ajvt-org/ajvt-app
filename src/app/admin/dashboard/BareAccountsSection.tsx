"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import { push } from "@/lib/messages";
import { countedNoun, DAYS } from "@/lib/arabicPlural";
import { daysWaiting } from "@/lib/waitingRequests";
import type { BareAccount } from "./types";

function NudgeButton({ user }: { user: BareAccount }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"sent" | "unreachable" | null>(null);

  async function nudge() {
    setBusy(true);
    try {
      const { reached } = await api.post<{ reached: number }>("/api/admin/waiting/chase", {
        userId: user.id,
        kind: "unfinished",
      });
      setDone(reached > 0 ? "sent" : "unreachable");
    } catch {
      setBusy(false);
    }
  }

  if (!user.hasPush || done === "unreachable") {
    return (
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {push.chaseUnreachable}
      </span>
    );
  }
  if (done === "sent") {
    return (
      <span className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
        {push.chaseSent}
      </span>
    );
  }
  return (
    <button
      onClick={nudge}
      disabled={busy}
      className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
      style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
    >
      <IconLabel name="bell">تذكير</IconLabel>
    </button>
  );
}

function Row({
  user,
  onFill,
  onDelete,
}: {
  user: BareAccount;
  onFill: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card p-3 flex items-center gap-2 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold" dir="ltr">
          {user.phone}
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          سجّل منذ {countedNoun(daysWaiting(new Date(user.createdAt), new Date()), DAYS)}
        </div>
      </div>
      <NudgeButton user={user} />
      <button
        onClick={onFill}
        className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
        style={{ background: "var(--mint-700)", color: "white" }}
      >
        <IconLabel name="plus">إضافة طلب</IconLabel>
      </button>
      <span className="w-4 shrink-0" aria-hidden />
      <button
        onClick={onDelete}
        className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
        style={{ background: "transparent", color: "#dc2626", border: "1px solid #fecaca" }}
      >
        <IconLabel name="trash">حذف</IconLabel>
      </button>
    </div>
  );
}

export default function BareAccountsSection({
  users,
  loading,
  onFill,
  onChanged,
}: {
  users: BareAccount[];
  loading: boolean;
  onFill: (phone: string) => void;
  onChanged: () => Promise<void> | void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<BareAccount | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function deleteUser(id: string, confirmPhone: string) {
    setDeleteLoading(true);
    try {
      await api.del(`/api/admin/users/${id}`, { confirmPhone });
      setConfirmDelete(null);
      await onChanged();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        حسابات سجّلت في التطبيق ولم ترسل طلب عضوية بعد.
      </p>
      {users.length === 0 ? (
        <div className="card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          لا توجد حسابات بدون طلب
        </div>
      ) : (
        users.map((user) => (
          <Row
            key={user.id}
            user={user}
            onFill={() => onFill(user.phone)}
            onDelete={() => setConfirmDelete(user)}
          />
        ))
      )}
      {confirmDelete && (
        <ConfirmDeleteDialog
          name={confirmDelete.phone}
          loading={deleteLoading}
          onConfirm={(typed) => deleteUser(confirmDelete.id, typed)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
