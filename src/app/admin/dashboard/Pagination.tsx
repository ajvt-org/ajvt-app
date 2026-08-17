"use client";

import Icon from "@/components/Icon";

const BUTTON =
  "text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-40 inline-flex items-center gap-1";
const BUTTON_STYLE = { background: "var(--mint-100)", color: "var(--mint-700)" };

export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 mt-3">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className={BUTTON}
        style={BUTTON_STYLE}
      >
        <Icon name="chevronRight" size={14} />
        السابق
      </button>
      <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
        صفحة {page} / {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className={BUTTON}
        style={BUTTON_STYLE}
      >
        التالي
        <Icon name="chevronLeft" size={14} />
      </button>
    </div>
  );
}
