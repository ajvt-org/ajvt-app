export type SeatKind = "member" | "request" | "invitation";

export interface SeatRow {
  status: "PENDING" | "ACTIVE";
  invitedByCaptain: boolean;
}

export function seatKind(row: SeatRow): SeatKind {
  if (row.status === "ACTIVE") return "member";
  return row.invitedByCaptain ? "invitation" : "request";
}

export function isMember(row: SeatRow): boolean {
  return seatKind(row) === "member";
}

export function isRequest(row: SeatRow): boolean {
  return seatKind(row) === "request";
}

export function isInvitation(row: SeatRow): boolean {
  return seatKind(row) === "invitation";
}

export function activeCount(rows: SeatRow[]): number {
  return rows.filter(isMember).length;
}
