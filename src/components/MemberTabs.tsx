"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";

// The bar is fixed, so it would sit on top of the last thing on the page. The
// spacer is an ordinary block of the same height in normal flow, which keeps
// every page clear of it without any page having to know the bar exists.
const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/home", label: "الأنشطة", icon: "trophy" },
  { href: "/donate", label: "ادعم", icon: "heart" },
  { href: "/quiz", label: "المسابقة", icon: "quiz" },
];

export default function MemberTabs() {
  const pathname = usePathname();

  return (
    <>
      <div className="tab-bar-spacer" aria-hidden="true" />
      <nav className="tab-bar" aria-label="التنقل">
        <div className="tab-bar-inner">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
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
