"use client";

import IconLabel from "@/components/IconLabel";
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
      className="tab-strip px-3 py-1.5 sm:px-4 sm:py-2"
      style={{ background: "var(--mint-50)", borderBottom: "1px solid var(--mint-100)" }}
    >
      {tabs.map((tab) => {
        const on = tabActive(tab.href, pathname);
        return (
          <button
            key={tab.href}
            onClick={() => onOpen(tab.href)}
            aria-current={on ? "page" : undefined}
            className="text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl"
            style={{
              background: on ? "var(--mint-700)" : "white",
              color: on ? "white" : "var(--text-main)",
              border: `1px solid ${on ? "var(--mint-700)" : "var(--mint-100)"}`,
            }}
          >
            <IconLabel name={tab.icon}>{tab.label}</IconLabel>
          </button>
        );
      })}
    </div>
  );
}
