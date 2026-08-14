import type { FilterTab, Status } from "./types";

export function initialFilterTab(members: { status: Status }[]): FilterTab {
  return members.some((m) => m.status === "PENDING") ? "PENDING" : "ALL";
}
