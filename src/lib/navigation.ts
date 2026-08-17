import type { IconName } from "@/components/Icon";

export type Tab = { href: string; label: string; icon: IconName; also?: string[] };

export const MEMBER_TABS: Tab[] = [
  { href: "/profile", label: "حسابي", icon: "user" },
  { href: "/home", label: "الأنشطة", icon: "trophy", also: ["/activities"] },
  { href: "/leaderboard", label: "الداعمون", icon: "medal" },
  { href: "/donate", label: "ادعم", icon: "heart" },
  { href: "/ages", label: "الأعصار", icon: "users" },
  { href: "/quiz", label: "المسابقة", icon: "quiz" },
];

export const VISITOR_TABS: Tab[] = [
  { href: "/", label: "دخول", icon: "user" },
  { href: "/activities", label: "الأنشطة", icon: "trophy" },
  { href: "/leaderboard", label: "الداعمون", icon: "medal" },
  { href: "/donate", label: "ادعم", icon: "heart" },
  { href: "/ages", label: "الأعصار", icon: "users" },
  { href: "/quiz", label: "المسابقة", icon: "quiz" },
];

export function isTabActive(tab: Tab, pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return [tab.href, ...(tab.also ?? [])].some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`),
  );
}

export type LandingSection = "hero" | "activities";

export const LANDING_SECTIONS: LandingSection[] = ["hero"];
