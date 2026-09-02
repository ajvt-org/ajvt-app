import type { IconName } from "@/components/Icon";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { SCOPED_ROLE } from "@/lib/activityAccess";

export interface RoleTone {
  className: string;
  icon: IconName;
}

const OWNER: RoleTone = { className: "badge-owner", icon: "star" };
const FULL: RoleTone = { className: "badge-active", icon: "shield" };

const TONES: Record<string, RoleTone> = {
  [OWNER_ROLE]: OWNER,
  [SUPER_ROLE]: FULL,
  MEMBERS: { className: "badge-open", icon: "users" },
  ACTIVITIES: { className: "badge-open", icon: "trophy" },
  QUIZ: { className: "badge-open", icon: "quiz" },
  [SCOPED_ROLE]: { className: "badge-open", icon: "pin" },
};

const UNKNOWN: RoleTone = { className: "badge-pending", icon: "question" };

export function roleTone(role: string): RoleTone {
  return TONES[role] ?? UNKNOWN;
}
