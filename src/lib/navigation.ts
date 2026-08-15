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

// A visitor gets the way in first — leading edge, so rightmost in Arabic —
// and it points at the landing page rather than straight at the login form,
// which carries no bar and would strand them.
export const VISITOR_TABS: Tab[] = [
  { href: "/", label: "دخول", icon: "user" },
  { href: "/activities", label: "الأنشطة", icon: "trophy" },
  { href: "/donate", label: "ادعم", icon: "heart" },
  { href: "/quiz", label: "المسابقة", icon: "quiz" },
];

export type LandingSection = "hero" | "activities";

// The landing page is the way in: who the association is and the two doors.
// The activities have their own tab, so they are not repeated here. Adding
// "activities" back puts the list underneath the hero again.
export const LANDING_SECTIONS: LandingSection[] = ["hero"];
