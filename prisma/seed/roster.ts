import { AGE_GROUP_ROSTER } from "./data";

export type MemberStatus = "ACTIVE" | "PENDING" | "REJECTED";

export interface RosterSlot {
  age: string;
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
      for (let i = 0; i < count; i++) slots.push({ age: group.name, status });
    }
  }
  return slots;
}
