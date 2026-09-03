"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { placeRowMenu, type MenuSpot } from "./rowMenuPosition";
import { useRowMenu } from "./useRowMenu";

export interface RowMenuItem {
  key: string;
  label: string;
  icon: IconName;
  href?: string;
  onPick?: () => void;
}

const MEASURING = { position: "fixed", left: 0, top: 0, visibility: "hidden" } as const;

export default function ActivityRowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [spot, setSpot] = useState<MenuSpot | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { open, toggle, close } = useRowMenu(box, trigger);

  const place = useCallback(() => {
    const anchor = box.current;
    const menu = panel.current;
    if (!anchor || !menu) return;
    const rect = anchor.getBoundingClientRect();
    const page = document.documentElement;
    const at = placeRowMenu(
      rect,
      { width: menu.offsetWidth, height: menu.offsetHeight },
      { width: page.clientWidth, height: page.clientHeight },
      getComputedStyle(anchor).direction === "rtl",
    );
    setSpot({ left: at.left - rect.left, top: at.top - rect.top });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    function again() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    }
    window.addEventListener("scroll", again, true);
    window.addEventListener("resize", again);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", again, true);
      window.removeEventListener("resize", again);
    };
  }, [open, place]);

  if (items.length === 0) return null;

  return (
    <div ref={box} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          setSpot(null);
          toggle();
        }}
        aria-label={label}
        aria-expanded={open}
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: "var(--mint-50)", color: "var(--mint-700)" }}
      >
        <Icon name="dots" size={15} />
      </button>

      {open && (
        <div
          ref={panel}
          className="absolute z-20 rounded-xl overflow-hidden"
          style={{
            ...(spot ? { left: `${spot.left}px`, top: `${spot.top}px` } : MEASURING),
            width: "11rem",
            maxWidth: "calc(100vw - 1rem)",
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
                  close();
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
