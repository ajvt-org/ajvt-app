"use client";

import { Suspense, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { MEMBER_TABS, VISITOR_TABS, isTabActive, type Tab } from "@/lib/navigation";
import { remember, tabTarget, type TabMemory } from "@/lib/tabMemory";

const STORE = "ajvt-tab-memory";
const EMPTY: TabMemory = {};

let cachedRaw: string | null = null;
let cached: TabMemory = EMPTY;
const listeners = new Set<() => void>();

function readMemory(): TabMemory {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORE);
  } catch {}
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    cached = raw ? (JSON.parse(raw) as TabMemory) : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function subscribeMemory(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function writeMemory(next: TabMemory) {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(next));
  } catch {}
  for (const listener of listeners) listener();
}

function TabBar({ tabs, memory }: { tabs: Tab[]; memory: TabMemory }) {
  const pathname = usePathname();

  return (
    <nav className="tab-bar" aria-label="التنقل">
      <div className="tab-bar-inner">
        {tabs.map((tab) => {
          const active = isTabActive(tab, pathname);
          return (
            <Link
              key={tab.href}
              href={tabTarget(tab, memory, pathname ?? "")}
              aria-current={active ? "page" : undefined}
              className="tab-bar-item"
              style={{ color: active ? "var(--mint-700)" : "var(--text-muted)" }}
            >
              <span className="tab-bar-icon">
                <Icon name={tab.icon} size={22} />
              </span>
              <span className="tab-bar-label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function RememberingTabBar({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const memory = useSyncExternalStore(subscribeMemory, readMemory, () => EMPTY);

  useEffect(() => {
    if (!pathname) return;
    const current = readMemory();
    const next = remember(current, tabs, pathname, search ? `?${search}` : "");
    if (next !== current) writeMemory(next);
  }, [pathname, search, tabs]);

  return <TabBar tabs={tabs} memory={memory} />;
}

// The bar is fixed, so it would sit on top of the last thing on the page. The
// spacer is an ordinary block of the same height in normal flow, which keeps
// every page clear of it without any page having to know the bar exists.
export default function MemberTabs({ signedIn = true }: { signedIn?: boolean }) {
  const tabs = signedIn ? MEMBER_TABS : VISITOR_TABS;

  return (
    <>
      <div className="tab-bar-spacer" aria-hidden="true" />
      <Suspense fallback={<TabBar tabs={tabs} memory={{}} />}>
        <RememberingTabBar tabs={tabs} />
      </Suspense>
    </>
  );
}
