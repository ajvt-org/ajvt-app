export type ReceiptPurpose = "MEMBERSHIP" | "ACTIVITY" | "DONATION";

export interface ReceiptRow {
  id: string;
  amount: number;
  purpose: ReceiptPurpose;
  paidAt: string;
  year: number | null;
  memberNumber: string | null;
  payerName: string;
  activityTitle: string | null;
}

export const PURPOSE_LABEL: Record<ReceiptPurpose, string> = {
  MEMBERSHIP: "اشتراك عضوية",
  ACTIVITY: "دعم نشاط",
  DONATION: "تبرع",
};

export function receiptTitle(row: Pick<ReceiptRow, "purpose" | "year" | "activityTitle">): string {
  if (row.purpose === "MEMBERSHIP") {
    return row.year ? `${PURPOSE_LABEL.MEMBERSHIP} ${row.year}` : PURPOSE_LABEL.MEMBERSHIP;
  }
  if (row.purpose === "ACTIVITY" && row.activityTitle) {
    return `${PURPOSE_LABEL.ACTIVITY} — ${row.activityTitle}`;
  }
  return PURPOSE_LABEL[row.purpose];
}

export function receiptReference(row: ReceiptRow): string {
  return row.id.slice(-8).toUpperCase();
}

export function receiptFilename(row: ReceiptRow): string {
  return `وصل-${receiptReference(row)}.png`;
}
