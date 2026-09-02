import { hasFullAccess } from "./adminRoles";

export const SCOPED_ROLE = "ACTIVITY";

export function isScopedRole(role: string): boolean {
  return role === SCOPED_ROLE;
}

export function seesEveryActivity(role: string): boolean {
  return hasFullAccess(role) || role === "ACTIVITIES";
}

export function allowsActivity(role: string, attached: boolean): boolean {
  if (seesEveryActivity(role)) return true;
  if (isScopedRole(role)) return attached;
  return false;
}
