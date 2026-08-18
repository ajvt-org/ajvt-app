"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

const OUTLINE = {
  background: "white",
  color: "var(--mint-700)",
  border: "1px solid var(--mint-100)",
};

export default function DashboardToolbar({
  statsOpen,
  onToggleStats,
  onExport,
}: {
  statsOpen: boolean;
  onToggleStats: () => void;
  onExport: () => void;
}) {
  return (
    <div className="flex gap-2 mb-3 sm:mb-4">
      <button
        onClick={onToggleStats}
        className="flex-1 text-xs sm:text-sm font-bold px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl flex items-center justify-between"
        style={OUTLINE}
      >
        <IconLabel name="chart">الإحصائيات</IconLabel>
        <Icon name={statsOpen ? "chevronUp" : "chevronDown"} size={14} />
      </button>
      <button
        onClick={onExport}
        aria-label="تصدير CSV"
        title="تصدير CSV"
        className="text-xs sm:text-sm font-bold px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl flex items-center"
        style={OUTLINE}
      >
        <Icon name="download" size={18} />
      </button>
    </div>
  );
}
