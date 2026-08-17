"use client";

import { formatDateTime } from "@/lib/utils";
import { adminRoleLabel } from "@/lib/adminRoles";
import type { AdminAccount } from "./accountTypes";

export default function AccountRow({
  account,
  onDelete,
}: {
  account: AdminAccount;
  onDelete: () => void;
}) {
  return (
    <div className="card p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
            {account.username}
          </p>
          <span className="badge badge-pending">{adminRoleLabel(account.role)}</span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          منذ {formatDateTime(account.createdAt)}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {account.lastLoginAt
            ? `آخر دخول: ${formatDateTime(account.lastLoginAt)} — ${account.lastLoginIp || "—"}`
            : "لم يسجّل الدخول بعد"}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
        style={{ background: "#fee2e2", color: "#991b1b" }}
      >
        حذف
      </button>
    </div>
  );
}
