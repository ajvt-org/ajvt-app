import type { HistoryTrail } from "./historyTrail";

export type BackMove = "unwind" | "replace";

export function backMove(href: string, trail: Pick<HistoryTrail, "previousIs">): BackMove {
  return trail.previousIs(href) ? "unwind" : "replace";
}
