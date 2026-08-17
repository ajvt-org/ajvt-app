"use client";

import { formatDateTime } from "@/lib/utils";
import { adminRoleLabel } from "@/lib/adminRoles";
import Icon from "@/components/Icon";
import type { AdminAccount } from "./accountTypes";

export default function AccountRow({
  account,
  onScope,
  onDelete,
}: {
  account: AdminAccount;
  onScope: () => void;
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
        {account.activities.length > 0 && (
          <p className="text-xs font-semibold" style={{ color: "var(--mint-700)" }}>
            {account.activities.map((a) => a.title).join("، ")}
          </p>
        )}
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          منذ {formatDateTime(account.createdAt)}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {account.lastLoginAt
            ? `آخر دخول: ${formatDateTime(account.lastLoginAt)} — ${account.lastLoginIp || "—"}`
            : "لم يسجّل الدخول بعد"}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onScope}
          aria-label="تحديد الأنشطة"
          className="p-1.5 rounded-lg"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <Icon name="trophy" size={16} />
        </button>
        <button
          onClick={onDelete}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          حذف
        </button>
      </div>
    </div>
  );
}
