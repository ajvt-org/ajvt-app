export type ConfigurationLock = "RECORDED" | "STARTED";

export function lockOf(
  startsAt: Date | null,
  recorded: boolean,
  now: Date,
): ConfigurationLock | null {
  if (recorded) return "RECORDED";
  if (startsAt !== null && startsAt <= now) return "STARTED";
  return null;
}
