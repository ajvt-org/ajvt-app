export const HOME_VILLAGE = "التاكلالت";

export const OTHER_VILLAGE = "أخرى";

export const VILLAGE_NAME_MAX = 30;

export function requiresAgeGroup(village: string): boolean {
  return village.trim() === HOME_VILLAGE;
}

export function isReservedVillageName(name: string): boolean {
  return name.trim() === OTHER_VILLAGE;
}

export function villageChoices(names: string[]): string[] {
  const managed = names.filter((name) => name !== HOME_VILLAGE && name !== OTHER_VILLAGE);
  return [HOME_VILLAGE, ...managed, OTHER_VILLAGE];
}

export function isKnownVillage(village: string, names: string[]): boolean {
  const trimmed = village.trim();
  if (trimmed === HOME_VILLAGE || trimmed === OTHER_VILLAGE) return true;
  return names.includes(trimmed);
}

export function ageForVillage(village: string, age: string | null | undefined): string | null {
  if (!requiresAgeGroup(village)) return null;
  return age?.trim() || null;
}
