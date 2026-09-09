"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Icon from "@/components/Icon";

export default function Disclosure({
  title,
  color,
  surface,
  className,
  defaultOpen = false,
  children,
}: {
  title: ReactNode;
  color: string;
  surface?: CSSProperties;
  className?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className} style={surface}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 font-black"
        style={{ color }}
      >
        {title}
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} />
      </button>
      {open && children}
    </div>
  );
}
