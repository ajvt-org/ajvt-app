"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { memberSearch, villagesDialog } from "@/lib/texts";
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
  onImport,
}: {
  statsOpen: boolean;
  onToggleStats: () => void;
  onExport: () => void;
  onManageAgeGroups: () => void;
  onManageVillages: () => void;
  onImport: () => void;
}) {
  const [open, setOpen] = useState(false);

  const items = [
    {
      label: statsOpen ? memberSearch.hideStats : memberSearch.showStats,
      icon: "chart" as const,
      run: onToggleStats,
    },
    { label: memberSearch.importFromFile, icon: "upload" as const, run: onImport },
    { label: memberSearch.export, icon: "download" as const, run: onExport },
    { label: memberSearch.ageGroups, icon: "tag" as const, run: onManageAgeGroups },
    { label: villagesDialog.title, icon: "tag" as const, run: onManageVillages },
  ];

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={memberSearch.more}
        aria-expanded={open}
        className="btn btn-sm"
        style={OUTLINE}
      >
        <Icon name="dots" size={16} />
      </button>
      {open && (
        <>
          <button
            aria-label={memberSearch.closeMenu}
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
  onImport,
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
  onImport: () => void;
}) {
  return (
    <div className="flex gap-2 mb-3 flex-wrap">
      <input
        type="text"
        placeholder={memberSearch.searchPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input input-sm flex-1"
        style={{ background: "white", minWidth: "10rem" }}
      />
      <button onClick={onOpenFilters} className="btn btn-sm relative" style={OUTLINE}>
        <IconLabel name="filter">{memberSearch.filter}</IconLabel>
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
        onImport={onImport}
      />
      <button onClick={onManualAdd} className="btn btn-primary btn-sm">
        <IconLabel name="plus">{memberSearch.add}</IconLabel>
      </button>
    </div>
  );
}
