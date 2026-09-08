export const LOGGED_DONATION_FIELDS = [
  "anonymous",
  "donorName",
  "donorPhone",
  "donorPhoto",
  "amount",
  "paymentMethod",
  "accountId",
  "bankReference",
  "proof",
] as const;

export type LoggedDonationField = (typeof LOGGED_DONATION_FIELDS)[number];

type Patch = Partial<Record<LoggedDonationField, unknown>>;

export function donationWasChanged(patch: Patch): boolean {
  return LOGGED_DONATION_FIELDS.some((field) => patch[field] !== undefined);
}

export function donationLogSnapshot(row: Record<LoggedDonationField, unknown>) {
  return Object.fromEntries(LOGGED_DONATION_FIELDS.map((field) => [field, row[field]]));
}
