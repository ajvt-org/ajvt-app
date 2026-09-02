import { money } from "./messages";

export function scrubNames<T extends object>(entry: T, names: string[]): T {
  if (names.length === 0) return entry;
  let text = JSON.stringify(entry);
  if (!names.some((name) => text.includes(name))) return entry;
  for (const name of names) text = text.split(name).join(money.anonymousDonor);
  return JSON.parse(text) as T;
}
