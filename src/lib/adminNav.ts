export const ALL_AREAS = null;

const ROLE_AREAS: Record<string, string[] | null> = {
  SUPER: ALL_AREAS,
  MEMBERS: ["/admin/dashboard", "/admin/payments", "/admin/expenses"],
  ACTIVITIES: ["/admin/activities", "/admin/payments", "/admin/expenses"],
  QUIZ: ["/admin/quiz"],
  ACTIVITY: ["/admin/activities"],
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

export function landingFor(role: string | null | undefined): string | null {
  const areas = allowedAreas(role);
  if (areas === ALL_AREAS) return null;
  return areas[0] ?? null;
}
