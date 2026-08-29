import { money } from "./messages";
import { nameOf } from "./person";

export interface DonorAttribution {
  donorName: string | null;
  user?: { fullName: string | null } | null;
}

export type PublicDonorAttribution = DonorAttribution & { anonymous: boolean };

export function typedDonorName(donor: { donorName: string | null }): string | null {
  return donor.donorName?.trim() || null;
}

export function attributedDonorName(donor: DonorAttribution): string | null {
  const account = donor.user ? nameOf(donor.user).trim() : "";
  return account || typedDonorName(donor);
}

export function donorNameOnRecord(donor: DonorAttribution): string {
  return attributedDonorName(donor) ?? money.anonymousDonor;
}

export function publicDonorName(donor: PublicDonorAttribution): string {
  return donor.anonymous ? money.anonymousDonor : donorNameOnRecord(donor);
}
