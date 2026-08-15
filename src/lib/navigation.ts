import type { IconName } from "@/components/Icon";

// What the bottom bar offers and what the landing page is made of, in one
// place. Reordering a tab, renaming one, or dropping a section off the
// landing page is an edit here rather than a hunt through the pages.
// `also` are the pages a tab opens onto but does not own the path of, so the
// tab stays lit while you are down inside it.
export type Tab = { href: string; label: string; icon: IconName; also?: string[] };

export const MEMBER_TABS: Tab[] = [
  { href: "/profile", label: "حسابي", icon: "user" },
  { href: "/home", label: "الأنشطة", icon: "trophy", also: ["/activities"] },
  { href: "/donate", label: "ادعم", icon: "heart" },
  { href: "/quiz", label: "المسابقة", icon: "quiz" },
];

// The account comes first — leading edge, so rightmost in Arabic — and holds
// that spot in both bars, so the same tap reaches the account whether or not
// there is one yet. A visitor's version points at the landing page rather
// than straight at the login form, which carries no bar and would strand them.
export const VISITOR_TABS: Tab[] = [
  { href: "/", label: "دخول", icon: "user" },
  { href: "/activities", label: "الأنشطة", icon: "trophy" },
  { href: "/donate", label: "ادعم", icon: "heart" },
  { href: "/quiz", label: "المسابقة", icon: "quiz" },
];

// A prefix has to end at a segment boundary, or /home would claim /homework.
// "/" is every path's prefix, so it only ever matches itself.
export function isTabActive(tab: Tab, pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return [tab.href, ...(tab.also ?? [])].some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`),
  );
}

export type LandingSection = "hero" | "activities";

// The landing page is the way in: who the association is and the two doors.
// The activities have their own tab, so they are not repeated here. Adding
// "activities" back puts the list underneath the hero again.
export const LANDING_SECTIONS: LandingSection[] = ["hero"];
