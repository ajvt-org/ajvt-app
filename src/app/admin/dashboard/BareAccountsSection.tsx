"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import Notice from "@/components/Notice";
import PageLoading from "@/components/PageLoading";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import VerbButton from "@/components/admin/VerbButton";
import { GRAVE, LEAD, SAFE } from "@/components/admin/verbTones";
import { push } from "@/lib/messages";
import { daysWaiting } from "@/lib/waitingRequests";
import { personDetails } from "@/lib/personDetails";
import { matchesSearch, searchTokens } from "@/lib/arabicText";
import { ageForVillage, requiresAgeGroup } from "@/lib/villages";
import TempPasswordBox from "@/components/admin/TempPasswordBox";
import { bareAccounts as texts, confirmDelete as confirmDeleteTexts } from "@/lib/texts";
import type { BareAccount } from "./types";

interface TempPassword {
  password: string;
  hours: number;
}

function identify(user: BareAccount): string {
  return user.fullName?.trim() || user.phone || user.id;
}

function accountText(user: BareAccount): string {
  return [user.fullName, user.phone].filter(Boolean).join(" ");
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
    <VerbButton icon="bell" label={texts.nudge} tone={SAFE} disabled={busy} onClick={nudge}>
      {texts.nudge}
    </VerbButton>
  );
}

function Row({
  user,
  temp,
  onIssued,
  onFill,
  onDelete,
}: {
  user: BareAccount;
  temp: TempPassword | null;
  onIssued: (temp: TempPassword) => void;
  onFill: () => void;
  onDelete: () => void;
}) {
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");

  const age = ageForVillage(user.village, user.age);
  const details = personDetails({
    phone: user.fullName ? user.phone : null,
    village: user.village,
    age,
  });
  const missingAgeGroup = requiresAgeGroup(user.village) && !age;

  async function resetPassword() {
    setResetBusy(true);
    setResetError("");
    try {
      const data = await api.post<{ tempPassword: string; hours: number }>(
        "/api/admin/reset-password",
        { userId: user.id },
      );
      onIssued({ password: data.tempPassword, hours: data.hours });
    } catch (e) {
      setResetError(errorMessage(e));
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
            <VerbButton
              icon="lock"
              label={texts.resetPassword}
              tone={SAFE}
              disabled={resetBusy}
              onClick={resetPassword}
            >
              {resetBusy ? texts.busy : texts.resetPassword}
            </VerbButton>
            <VerbButton icon="plus" label={texts.addRequest} tone={LEAD} onClick={onFill}>
              {texts.addRequest}
            </VerbButton>
          </>
        )}
        <span className="flex-1" aria-hidden />
        <VerbButton icon="trash" label={texts.remove} tone={GRAVE} onClick={onDelete}>
          {texts.remove}
        </VerbButton>
      </div>
      {resetError && <Notice tone="error">{resetError}</Notice>}
      {temp && <TempPasswordBox value={temp.password} hours={temp.hours} phone={user.phone} />}
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
  const [deleteError, setDeleteError] = useState("");
  const [search, setSearch] = useState("");
  const [issued, setIssued] = useState<Record<string, TempPassword>>({});

  async function deleteUser(id: string, confirmPhone: string) {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await api.del(`/api/admin/users/${id}`, { confirmPhone });
      setConfirmDelete(null);
      await onChanged();
    } catch (e) {
      setDeleteError(errorMessage(e));
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) return <PageLoading />;

  const tokens = searchTokens(search);
  const shown = tokens.length
    ? users.filter((user) => matchesSearch(accountText(user), tokens))
    : users;

  return (
    <div className="space-y-2">
      {deleteError && <Notice tone="error">{deleteError}</Notice>}

      {users.length > 0 && (
        <input
          type="text"
          placeholder={texts.searchPlaceholder}
          aria-label={texts.searchLabel}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input input-sm w-full"
          style={{ background: "white" }}
        />
      )}

      {shown.length === 0 ? (
        <div className="card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {users.length === 0 ? texts.empty : texts.noMatch}
        </div>
      ) : (
        shown.map((user) => (
          <Row
            key={user.id}
            user={user}
            temp={issued[user.id] ?? null}
            onIssued={(temp) => setIssued((held) => ({ ...held, [user.id]: temp }))}
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
