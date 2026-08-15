"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { MEMBER_TABS, VISITOR_TABS } from "@/lib/navigation";

// The bar is fixed, so it would sit on top of the last thing on the page. The
// spacer is an ordinary block of the same height in normal flow, which keeps
// every page clear of it without any page having to know the bar exists.
export default function MemberTabs({ signedIn = true }: { signedIn?: boolean }) {
  const pathname = usePathname();
  const tabs = signedIn ? MEMBER_TABS : VISITOR_TABS;

  return (
    <>
      <div className="tab-bar-spacer" aria-hidden="true" />
      <nav className="tab-bar" aria-label="التنقل">
        <div className="tab-bar-inner">
          {tabs.map((tab) => {
            const active = tab.href === "/" ? pathname === "/" : pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="tab-bar-item"
                style={{ color: active ? "var(--mint-700)" : "var(--text-muted)" }}
              >
                <Icon name={tab.icon} size={22} />
                <span className="tab-bar-label">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
