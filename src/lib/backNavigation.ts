import type { HistoryTrail } from "./historyTrail";

export type BackMove = "unwind" | "replace";

export interface ClickIntent {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}

export function opensHere(event: ClickIntent): boolean {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  return event.button === 0;
}

export function backMove(href: string, trail: Pick<HistoryTrail, "previousIs">): BackMove {
  return trail.previousIs(href) ? "unwind" : "replace";
}
