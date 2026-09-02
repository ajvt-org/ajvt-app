import { hasFullAccess } from "./adminRoles";

export interface ProofScope {
  membership: boolean;
  activity: boolean;
  donations: boolean;
}

export function proofScope(role: string): ProofScope {
  const full = hasFullAccess(role);
  return {
    membership: full || role === "MEMBERS",
    activity: full || role === "ACTIVITIES",
    donations: full,
  };
}
