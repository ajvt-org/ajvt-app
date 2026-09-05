"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { adminRoleLabel, ROLE_LABELS } from "@/lib/adminRoles";
import { settableRoles } from "@/lib/adminRoleChange";
import IconLabel from "@/components/IconLabel";
import Icon from "@/components/Icon";
import Notice from "@/components/Notice";
import { adminAccounts, lists } from "@/lib/texts";
import { roleTone } from "./roleTone";
import { isFullAccount } from "./accountTypes";
import type { AdminAccount, AdminAccountRow } from "./accountTypes";

const QUIET = { background: "var(--mint-100)", color: "var(--mint-700)" };
const DANGER = { background: "#fee2e2", color: "#991b1b" };

function RoleBadge({ role }: { role: string }) {
  const { className, icon } = roleTone(role);
  return (
    <span className={`badge ${className} shrink-0 whitespace-nowrap`}>
      <IconLabel name={icon}>{adminRoleLabel(role)}</IconLabel>
    </span>
  );
}

function RoleEditor({
  account,
  viewerRole,
  onRole,
  onClose,
}: {
  account: AdminAccount;
  viewerRole: string | null;
  onRole: (role: string) => Promise<void>;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState(account.role);
  const [saving, setSaving] = useState(false);
  const roles = settableRoles(viewerRole);

  async function apply() {
    setSaving(true);
    try {
      await onRole(picked);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 w-full">
      <label
        className="text-xs font-semibold block"
        style={{ color: "var(--text-muted)" }}
        htmlFor={`role-${account.id}`}
      >
        {adminAccounts.changeRole}
      </label>
      <select
        id={`role-${account.id}`}
        value={picked}
        disabled={saving}
        onChange={(e) => setPicked(e.target.value)}
        className="input input-sm w-full"
      >
        {roles.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
        {!roles.includes(account.role) && (
          <option value={account.role}>{adminRoleLabel(account.role)}</option>
        )}
      </select>
      <div className="flex items-center gap-2">
        <button
          onClick={apply}
          disabled={saving || picked === account.role}
          className="btn btn-sm btn-primary"
          type="button"
        >
          {saving ? adminAccounts.applyingRole : adminAccounts.applyRole}
        </button>
        <button onClick={onClose} disabled={saving} className="btn btn-sm btn-ghost" type="button">
          {adminAccounts.cancelRole}
        </button>
      </div>
    </div>
  );
}

function Details({ account }: { account: AdminAccount }) {
  return (
    <details className="text-xs" style={{ color: "var(--text-muted)" }}>
      <summary className="cursor-pointer select-none">{adminAccounts.moreDetails}</summary>
      <p className="mt-1">
        {adminAccounts.createdAt} {formatDateTime(account.createdAt)}
      </p>
      {account.lastLoginIp && (
        <p className="mt-1">
          {adminAccounts.lastLoginIp} <span dir="ltr">{account.lastLoginIp}</span>
        </p>
      )}
    </details>
  );
}

function Username({ name, isSelf }: { name: string; isSelf: boolean }) {
  return (
    <div className="min-w-0 flex items-baseline gap-1.5 flex-1">
      <p className="font-bold text-sm break-words" style={{ color: "var(--text-main)" }}>
        {name}
      </p>
      {isSelf && (
        <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
          ({adminAccounts.you})
        </span>
      )}
    </div>
  );
}

export default function AccountRow({
  account,
  viewerRole,
  isSelf,
  onScope,
  onRole,
  onDelete,
}: {
  account: AdminAccountRow;
  viewerRole: string | null;
  isSelf: boolean;
  onScope: () => void;
  onRole: (role: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  async function changeRole(role: string) {
    setError("");
    try {
      await onRole(role);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!isFullAccount(account)) {
    return (
      <div className="card p-3">
        <Username name={account.username} isSelf={isSelf} />
      </div>
    );
  }

  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <Username name={account.username} isSelf={isSelf} />
        {!editing && (
          <span className="flex items-center gap-1.5 shrink-0">
            <RoleBadge role={account.role} />
            {!isSelf && (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg"
                style={QUIET}
                type="button"
                aria-label={adminAccounts.changeRole}
              >
                <Icon name="pencil" size="1em" />
              </button>
            )}
          </span>
        )}
      </div>

      {editing && (
        <RoleEditor
          account={account}
          viewerRole={viewerRole}
          onRole={changeRole}
          onClose={() => setEditing(false)}
        />
      )}

      {account.activities.length > 0 && (
        <p className="text-xs font-semibold" style={{ color: "var(--mint-700)" }}>
          <IconLabel name="pin">
            {account.activities.map((a) => a.title).join(lists.separator)}
          </IconLabel>
        </p>
      )}

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {account.lastLoginAt
          ? `${adminAccounts.lastLogin} ${formatDateTime(account.lastLoginAt)}`
          : adminAccounts.neverSignedIn}
      </p>

      <Details account={account} />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="sep" />

      <div className="flex items-center gap-2">
        <button
          onClick={onScope}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={QUIET}
          type="button"
        >
          <IconLabel name="trophy">{adminAccounts.scope}</IconLabel>
        </button>
        <button
          onClick={onDelete}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold ms-auto"
          style={DANGER}
          type="button"
        >
          <IconLabel name="trash">{adminAccounts.remove}</IconLabel>
        </button>
      </div>
    </div>
  );
}
