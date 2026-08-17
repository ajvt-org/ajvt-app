export const SCOPED_ROLE = "ACTIVITY";

const UNSCOPED_ROLES = ["SUPER", "ACTIVITIES"];

export function isScopedRole(role: string): boolean {
  return role === SCOPED_ROLE;
}

export function seesEveryActivity(role: string): boolean {
  return UNSCOPED_ROLES.includes(role);
}

export function allowsActivity(role: string, attached: boolean): boolean {
  if (seesEveryActivity(role)) return true;
  if (isScopedRole(role)) return attached;
  return false;
}
