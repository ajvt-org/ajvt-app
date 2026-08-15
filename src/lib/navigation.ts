import type { IconName } from "@/components/Icon";

// What the bottom bar offers and what the landing page is made of, in one
// place. Reordering a tab, renaming one, or dropping a section off the
// landing page is an edit here rather than a hunt through the pages.
export type Tab = { href: string; label: string; icon: IconName };

export const MEMBER_TABS: Tab[] = [
  { href: "/home", label: "الأنشطة", icon: "trophy" },
  { href: "/donate", label: "ادعم", icon: "heart" },
  { href: "/quiz", label: "المسابقة", icon: "quiz" },
];

// A visitor with no account gets the same shape, with the last tab pointing
// at the way in rather than at their own pages.
export const VISITOR_TABS: Tab[] = [
  { href: "/", label: "الأنشطة", icon: "trophy" },
  { href: "/donate", label: "ادعم", icon: "heart" },
  { href: "/quiz", label: "المسابقة", icon: "quiz" },
  { href: "/login", label: "دخول", icon: "user" },
];

export type LandingSection = "hero" | "activities";

// Order is the order on screen. Drop one to hide it.
export const LANDING_SECTIONS: LandingSection[] = ["hero", "activities"];
