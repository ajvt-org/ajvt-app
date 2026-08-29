"use client";

import IconLabel from "@/components/IconLabel";

export default function ManageLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-bold"
      style={{ color: "var(--mint-600)" }}
    >
      <IconLabel name="tag">{label}</IconLabel>
    </button>
  );
}
