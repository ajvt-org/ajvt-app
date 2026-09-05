export const SUPER_ROLE = "SUPER";
export const OWNER_ROLE = "OWNER";

export const ROLE_LABELS: Record<string, string> = {
  OWNER: "المالك",
  SUPER: "كامل الصلاحيات",
  MEMBERS: "المستخدمون فقط",
  ACTIVITIES: "الأنشطة فقط",
  QUIZ: "المسابقات الثقافية فقط",
  ACTIVITY: "أنشطة محددة فقط",
};

export const ADMIN_ROLES = Object.keys(ROLE_LABELS);

const ROLE_RANK: Record<string, number> = { [OWNER_ROLE]: 2, [SUPER_ROLE]: 1 };

export function adminRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function isAdminRole(role: unknown): role is string {
  return typeof role === "string" && ADMIN_ROLES.includes(role);
}

export function hasFullAccess(role: string | null | undefined): boolean {
  return role === SUPER_ROLE || role === OWNER_ROLE;
}

export function isOwner(role: string | null | undefined): boolean {
  return role === OWNER_ROLE;
}

export function adminRoleRank(role: string | null | undefined): number {
  return typeof role === "string" ? (ROLE_RANK[role] ?? 0) : 0;
}

export function outranks(
  role: string | null | undefined,
  other: string | null | undefined,
): boolean {
  return adminRoleRank(role) > adminRoleRank(other);
}
