export interface ProofScope {
  membership: boolean;
  activity: boolean;
  donations: boolean;
}

export function proofScope(role: string): ProofScope {
  return {
    membership: role === "SUPER" || role === "MEMBERS",
    activity: role === "SUPER" || role === "ACTIVITIES",
    donations: role === "SUPER",
  };
}
