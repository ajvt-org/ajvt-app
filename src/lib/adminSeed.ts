export type SeedAdminAction = "retire" | "skip" | "create";

export function seedAdminAction(state: {
  defaultAdminExists: boolean;
  adminCount: number;
}): SeedAdminAction {
  if (state.defaultAdminExists) return "retire";
  return state.adminCount > 0 ? "skip" : "create";
}
