import { isTabActive, type Tab } from "./navigation";

export type TabMemory = Record<string, string>;

export function sectionOf(pathname: string, tabs: Tab[]): string | null {
  const tab = tabs.find((t) => isTabActive(t, pathname));
  return tab ? tab.href : null;
}

export function remember(memory: TabMemory, tabs: Tab[], pathname: string, search = ""): TabMemory {
  const section = sectionOf(pathname, tabs);
  if (!section) return memory;
  const full = pathname + search;
  if (memory[section] === full) return memory;
  return { ...memory, [section]: full };
}

export function tabTarget(tab: Tab, memory: TabMemory, pathname: string): string {
  if (isTabActive(tab, pathname)) return tab.href;
  return memory[tab.href] ?? tab.href;
}
