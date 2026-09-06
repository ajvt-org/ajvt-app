"use client";

import { tabActive } from "@/lib/adminNav";
import type { NavTab } from "./navTabs";
import { useStripScroll } from "./useStripScroll";

export default function SubTabStrip({
  tabs,
  pathname,
  onOpen,
}: {
  tabs: NavTab[];
  pathname: string | null;
  onOpen: (href: string) => void;
}) {
  const strip = useStripScroll(pathname);

  return (
    <div
      ref={strip}
      className="tab-strip px-3 sm:px-4"
      style={{ background: "white", borderBottom: "1px solid var(--mint-100)" }}
    >
      {tabs.map((tab) => {
        const on = tabActive(tab.href, pathname);
        return (
          <button
            key={tab.href}
            onClick={() => onOpen(tab.href)}
            aria-current={on ? "page" : undefined}
            className="text-xs sm:text-sm py-2 px-1"
            style={{
              color: on ? "var(--mint-700)" : "var(--text-muted)",
              fontWeight: on ? 800 : 600,
              borderBottom: `2px solid ${on ? "var(--mint-600)" : "transparent"}`,
              marginBottom: "-1px",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
