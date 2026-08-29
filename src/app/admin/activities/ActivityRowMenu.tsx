"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

export interface RowMenuItem {
  key: string;
  label: string;
  icon: IconName;
  href?: string;
  onPick?: () => void;
}

export default function ActivityRowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function away(event: MouseEvent) {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        aria-label={label}
        aria-expanded={open}
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: "var(--mint-50)", color: "var(--mint-700)" }}
      >
        <Icon name="dots" size={15} />
      </button>

      {open && (
        <div
          className="absolute z-20 rounded-xl overflow-hidden"
          style={{
            insetInlineStart: 0,
            top: "2.25rem",
            minWidth: "11rem",
            background: "white",
            border: "1px solid var(--mint-100)",
            boxShadow: "0 8px 24px rgba(26,63,51,0.14)",
          }}
        >
          {items.map((item) =>
            item.href ? (
              <Link
                key={item.key}
                href={item.href}
                className="block text-xs font-bold px-3 py-2.5 text-start"
                style={{ color: "var(--text-main)" }}
              >
                <IconLabel name={item.icon}>{item.label}</IconLabel>
              </Link>
            ) : (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onPick?.();
                }}
                className="block w-full text-xs font-bold px-3 py-2.5 text-start"
                style={{ color: "var(--text-main)" }}
              >
                <IconLabel name={item.icon}>{item.label}</IconLabel>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
