export const ALL_AREAS = null;

const OWN_ACCOUNT = ["/admin/tools", "/admin/password"];

const ROLE_AREAS: Record<string, string[] | null> = {
  SUPER: ALL_AREAS,
  MEMBERS: ["/admin/dashboard", "/admin/payments", "/admin/expenses", ...OWN_ACCOUNT],
  ACTIVITIES: ["/admin/activities", "/admin/payments", "/admin/expenses", ...OWN_ACCOUNT],
  QUIZ: ["/admin/quiz", ...OWN_ACCOUNT],
  ACTIVITY: ["/admin/activities", ...OWN_ACCOUNT],
};

export function allowedAreas(role: string | null | undefined): string[] | null {
  if (role === null || role === undefined) return ALL_AREAS;
  if (!(role in ROLE_AREAS)) return [];
  return ROLE_AREAS[role];
}

export function canOpen(role: string | null | undefined, pathname: string): boolean {
  const areas = allowedAreas(role);
  if (areas === ALL_AREAS) return true;
  return areas.some((area) => pathname.startsWith(area));
}

const TAB_ALIASES: Record<string, string[]> = {
  "/admin/dashboard": ["/admin/members"],
  "/admin/activities": ["/admin/tournament"],
  "/admin/tools": ["/admin/password", "/admin/admins", "/admin/audit-log", "/admin/broadcast"],
};

export function tabActive(tabHref: string, pathname: string | null): boolean {
  if (!pathname) return false;
  const prefixes = [tabHref, ...(TAB_ALIASES[tabHref] ?? [])];
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function landingFor(role: string | null | undefined): string | null {
  const areas = allowedAreas(role);
  if (areas === ALL_AREAS) return null;
  return areas[0] ?? null;
}
