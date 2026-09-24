import type { MultiSelectOption } from "@/components/admin/filters/MultiSelect";
import { OTHER_VILLAGE } from "@/lib/villages";
import type { AgeGroup, Village } from "./types";

function named(name: string): MultiSelectOption {
  return { value: name, label: name };
}

export function villageOptions(villages: Village[]): MultiSelectOption[] {
  return [...villages.map((village) => named(village.name)), named(OTHER_VILLAGE)];
}

export function ageOptions(ageGroups: AgeGroup[]): MultiSelectOption[] {
  return ageGroups.map((group) => named(group.name));
}
