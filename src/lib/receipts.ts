import { receiptPurpose } from "./texts/receipt";

export type ReceiptPurpose = "MEMBERSHIP" | "ACTIVITY" | "DONATION";

export interface ReceiptSubject {
  purpose: ReceiptPurpose;
  year: number | null;
  activityTitle: string | null;
}

export const PURPOSE_LABEL: Record<ReceiptPurpose, string> = {
  MEMBERSHIP: receiptPurpose.membership,
  ACTIVITY: receiptPurpose.activity,
  DONATION: receiptPurpose.donation,
};

export function receiptTitle(subject: ReceiptSubject): string {
  if (subject.purpose === "MEMBERSHIP") {
    return subject.year ? `${PURPOSE_LABEL.MEMBERSHIP} ${subject.year}` : PURPOSE_LABEL.MEMBERSHIP;
  }
  if (subject.purpose === "ACTIVITY" && subject.activityTitle) {
    return `${PURPOSE_LABEL.ACTIVITY} — ${subject.activityTitle}`;
  }
  return PURPOSE_LABEL[subject.purpose];
}
