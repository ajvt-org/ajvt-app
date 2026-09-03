import { money } from "./messages";
import { nameOf } from "./person";
import { seesSupporterName, type SupportViewer } from "./supportPrivacy";

export interface DonorAccount {
  fullName: string | null;
  supportNameConfidential: boolean;
}

export interface DonorAttribution {
  donorName: string | null;
  userId: string | null;
  user: DonorAccount | null;
}

export type PublicDonorAttribution = DonorAttribution & { anonymous: boolean };

export const DONOR_ACCOUNT_SELECT = {
  fullName: true,
  supportNameConfidential: true,
} as const;

export function nameAdoptedOnLink(
  account: { fullName: string | null } | null | undefined,
): string | null {
  return account?.fullName?.trim() || null;
}

export function attributedDonorName(donor: DonorAttribution, viewer: SupportViewer): string | null {
  if (!seesSupporterName(viewer, donor)) return null;
  const account = donor.user ? nameOf(donor.user).trim() : "";
  return account || donor.donorName?.trim() || null;
}

export function donorNameOnRecord(donor: DonorAttribution, viewer: SupportViewer): string {
  return attributedDonorName(donor, viewer) ?? money.anonymousDonor;
}

export function publicDonorName(donor: PublicDonorAttribution, viewer: SupportViewer): string {
  return donor.anonymous ? money.anonymousDonor : donorNameOnRecord(donor, viewer);
}
