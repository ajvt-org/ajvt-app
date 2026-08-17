"use client";

import Icon from "@/components/Icon";

export default function Pagination({
  page,
  totalPages,
  onGo,
}: {
  page: number;
  totalPages: number;
  onGo: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-1">
      <button
        onClick={() => onGo(page - 1)}
        disabled={page <= 1}
        className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-40 inline-flex items-center gap-1"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        <Icon name="chevronRight" size={14} />
        السابق
      </button>
      <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
        صفحة {page} / {totalPages}
      </span>
      <button
        onClick={() => onGo(page + 1)}
        disabled={page >= totalPages}
        className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-40 inline-flex items-center gap-1"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        التالي
        <Icon name="chevronLeft" size={14} />
      </button>
    </div>
  );
}
