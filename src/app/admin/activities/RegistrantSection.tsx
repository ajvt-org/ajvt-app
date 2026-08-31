"use client";

import { useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";

export default function RegistrantSection({
  icon,
  title,
  count,
  children,
}: {
  icon: IconName;
  title: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-xs font-bold"
        style={{ color: "var(--text-main)" }}
      >
        <IconLabel name={icon}>{`${title} (${count})`}</IconLabel>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} />
      </button>
      {open && children}
    </div>
  );
}
