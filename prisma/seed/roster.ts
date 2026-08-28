import { AGE_GROUP_ROSTER, NEIGHBOUR_ROSTER } from "./data";
import { HOME_VILLAGE } from "../../src/lib/villages";

export type MemberStatus = "ACTIVE" | "PENDING" | "REJECTED";

export interface RosterSlot {
  age: string | null;
  village: string;
  status: MemberStatus;
}

export function rosterSlots(): RosterSlot[] {
  const slots: RosterSlot[] = [];
  for (const group of AGE_GROUP_ROSTER) {
    const counts: [MemberStatus, number][] = [
      ["ACTIVE", group.active],
      ["PENDING", group.pending],
      ["REJECTED", group.rejected],
    ];
    for (const [status, count] of counts) {
      for (let i = 0; i < count; i++)
        slots.push({ age: group.name, village: HOME_VILLAGE, status });
    }
  }

  for (const group of NEIGHBOUR_ROSTER) {
    const counts: [MemberStatus, number][] = [
      ["ACTIVE", group.active],
      ["PENDING", group.pending],
      ["REJECTED", group.rejected],
    ];
    for (const [status, count] of counts) {
      for (let i = 0; i < count; i++) slots.push({ age: null, village: group.village, status });
    }
  }

  return slots;
}
