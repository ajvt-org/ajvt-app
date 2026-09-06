"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import { push } from "@/lib/messages";
import { daysWaiting } from "@/lib/waitingRequests";
import { personDetails } from "@/lib/personDetails";
import { ageForVillage, requiresAgeGroup } from "@/lib/villages";
import TempPasswordBox from "./TempPasswordBox";
import { bareAccounts as texts, confirmDelete as confirmDeleteTexts } from "@/lib/texts";
import type { BareAccount } from "./types";

function identify(user: BareAccount): string {
  return user.fullName?.trim() || user.phone || user.id;
}

function daysSince(createdAt: string): string {
  const days = daysWaiting(new Date(createdAt), new Date());
  if (days <= 0) return texts.signedUpToday;
  return texts.signedUpAgo(days);
}

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
      <IconLabel name="bell">{texts.nudge}</IconLabel>
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
  const [resetBusy, setResetBusy] = useState(false);
  const [temp, setTemp] = useState<{ password: string; hours: number } | null>(null);

  const age = ageForVillage(user.village, user.age);
  const details = personDetails({
    phone: user.fullName ? user.phone : null,
    village: user.village,
    age,
  });
  const missingAgeGroup = requiresAgeGroup(user.village) && !age;

  async function resetPassword() {
    setResetBusy(true);
    try {
      const data = await api.post<{ tempPassword: string; hours: number }>(
        "/api/admin/reset-password",
        { userId: user.id },
      );
      setTemp({ password: data.tempPassword, hours: data.hours });
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="card w-full p-3 sm:p-4 text-right">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white"
            style={{ background: "var(--mint-400)" }}
          >
            <Icon name="user" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--text-main)" }}>
              {identify(user)}
            </p>
            {details && (
              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                <bdi>{details}</bdi>
              </p>
            )}
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {user.phone ? daysSince(user.createdAt) : texts.addedByHand}
            </p>
            {missingAgeGroup && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {texts.noAgeGroup}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0">{user.phone && <NudgeButton user={user} />}</div>
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap" style={{ paddingRight: "52px" }}>
        {user.phone && (
          <>
            <button
              onClick={resetPassword}
              disabled={resetBusy}
              className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              {resetBusy ? "..." : <IconLabel name="lock">{texts.resetPassword}</IconLabel>}
            </button>
            <button
              onClick={onFill}
              className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
              style={{ background: "var(--mint-700)", color: "white" }}
            >
              <IconLabel name="plus">{texts.addRequest}</IconLabel>
            </button>
          </>
        )}
        <span className="flex-1" aria-hidden />
        <button
          onClick={onDelete}
          className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
          style={{ background: "transparent", color: "#dc2626", border: "1px solid #fecaca" }}
        >
          <IconLabel name="trash">{texts.remove}</IconLabel>
        </button>
      </div>
      {temp && <TempPasswordBox value={temp.password} hours={temp.hours} />}
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
  onFill: (person: { id: string; fullName: string }) => void;
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
        {texts.lead}
      </p>
      {users.length === 0 ? (
        <div className="card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {texts.empty}
        </div>
      ) : (
        users.map((user) => (
          <Row
            key={user.id}
            user={user}
            onFill={() => onFill({ id: user.id, fullName: identify(user) })}
            onDelete={() => setConfirmDelete(user)}
          />
        ))
      )}
      {confirmDelete && (
        <ConfirmDeleteDialog
          name={identify(confirmDelete)}
          consequence={confirmDeleteTexts.accountConsequence(identify(confirmDelete))}
          loading={deleteLoading}
          onConfirm={(typed) => deleteUser(confirmDelete.id, typed)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
