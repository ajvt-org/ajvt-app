"use client";

import Icon, { type IconName } from "./Icon";

export default function InstallBanner({
  icon,
  title,
  note,
  action,
  onDismiss,
}: {
  icon: IconName;
  title: string;
  note: string;
  action?: { label: string; onClick: () => void };
  onDismiss: () => void;
}) {
  return (
    <div
      className="install-prompt fixed inset-x-4 z-30 card p-3 flex items-center gap-3 fade-up"
      style={{ maxWidth: "420px", margin: "0 auto", border: "1px solid var(--mint-200)" }}
    >
      <span className="shrink-0" style={{ color: "var(--mint-700)" }}>
        <Icon name={icon} size={22} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          {title}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {note}
        </p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs px-3 py-2 rounded-lg font-bold shrink-0"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          {action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="إغلاق"
        className="px-1 shrink-0 flex items-center"
        style={{ color: "var(--text-muted)" }}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
