export interface PhoneOnDonation {
  userId?: string | null;
  donorPhone?: string | null;
}

export interface PhoneOnAccount {
  phone: string | null;
}

export function donorPhoneShown(
  donor: PhoneOnDonation,
  account?: PhoneOnAccount | null,
): string | null {
  if (donor.userId) return account?.phone?.trim() || null;
  return donor.donorPhone?.trim() || null;
}
