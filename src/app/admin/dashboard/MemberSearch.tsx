"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { villagesDialog } from "@/lib/texts";
import IconLabel from "@/components/IconLabel";

const OUTLINE = {
  background: "white",
  color: "var(--mint-700)",
  border: "1px solid var(--mint-100)",
};

function MoreMenu({
  statsOpen,
  onToggleStats,
  onExport,
  onManageAgeGroups,
  onManageVillages,
}: {
  statsOpen: boolean;
  onToggleStats: () => void;
  onExport: () => void;
  onManageAgeGroups: () => void;
  onManageVillages: () => void;
}) {
  const [open, setOpen] = useState(false);

  const items = [
    {
      label: statsOpen ? "إخفاء الإحصائيات" : "الإحصائيات",
      icon: "chart" as const,
      run: onToggleStats,
    },
    { label: "تصدير", icon: "download" as const, run: onExport },
    { label: "الأعصار", icon: "tag" as const, run: onManageAgeGroups },
    { label: villagesDialog.title, icon: "tag" as const, run: onManageVillages },
  ];

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="المزيد"
        aria-expanded={open}
        className="btn btn-sm text-xs"
        style={OUTLINE}
      >
        <Icon name="dots" size={16} />
      </button>
      {open && (
        <>
          <button
            aria-label="إغلاق القائمة"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute end-0 top-full mt-1 z-20 rounded-xl overflow-hidden"
            style={{ background: "white", border: "1px solid var(--mint-100)", minWidth: "11rem" }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setOpen(false);
                  item.run();
                }}
                className="w-full text-start text-xs font-bold px-3 py-2.5"
                style={{ color: "var(--text-main)" }}
              >
                <IconLabel name={item.icon}>{item.label}</IconLabel>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function MemberSearch({
  value,
  filterCount,
  statsOpen,
  onChange,
  onOpenFilters,
  onToggleStats,
  onExport,
  onManageAgeGroups,
  onManageVillages,
  onManualAdd,
}: {
  value: string;
  filterCount: number;
  statsOpen: boolean;
  onChange: (q: string) => void;
  onOpenFilters: () => void;
  onToggleStats: () => void;
  onExport: () => void;
  onManageAgeGroups: () => void;
  onManageVillages: () => void;
  onManualAdd: () => void;
}) {
  return (
    <div className="flex gap-2 mb-3 flex-wrap">
      <input
        type="text"
        placeholder="بحث بالاسم أو الهاتف أو رمز الطلب..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input input-sm flex-1"
        style={{ background: "white", minWidth: "10rem" }}
      />
      <button onClick={onOpenFilters} className="btn btn-sm text-xs relative" style={OUTLINE}>
        <IconLabel name="filter">تصفية</IconLabel>
        {filterCount > 0 && (
          <span
            dir="ltr"
            className="absolute -top-1.5 -start-1.5 rounded-full text-white font-black flex items-center justify-center"
            style={{
              background: "var(--mint-600)",
              fontSize: "9px",
              minWidth: "16px",
              height: "16px",
            }}
          >
            {filterCount}
          </span>
        )}
      </button>
      <MoreMenu
        statsOpen={statsOpen}
        onToggleStats={onToggleStats}
        onExport={onExport}
        onManageAgeGroups={onManageAgeGroups}
        onManageVillages={onManageVillages}
      />
      <button onClick={onManualAdd} className="btn btn-primary btn-sm text-xs">
        <IconLabel name="plus">إضافة عضو</IconLabel>
      </button>
    </div>
  );
}
