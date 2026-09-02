import { isOwner } from "./adminRoles";
import { isScopedRole } from "./activityAccess";

export function touchesOwnerRole(before: string, after: string): boolean {
  return isOwner(before) || isOwner(after);
}

export function strandsOwnerRole(before: string, after: string, owners: number): boolean {
  return isOwner(before) && !isOwner(after) && owners <= 1;
}

export function leavesScope(before: string, after: string): boolean {
  return isScopedRole(before) && !isScopedRole(after);
}
