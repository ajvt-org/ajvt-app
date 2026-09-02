import { donorNameOnRecord, type DonorAccount } from "./donorName";
import { seesSupporterName, withoutFields, type SupportViewer } from "./supportPrivacy";

const HIDDEN_ON_A_DONATION = ["donorName", "donorPhone", "donorPhoto", "proof"] as const;

export interface DonationRow {
  donorName: string | null;
  donorPhone: string | null;
  donorPhoto: string | null;
  proof: string | null;
  userId: string | null;
  user: DonorAccount | null;
}

export function donationView<T extends DonationRow>(donation: T, viewer: SupportViewer) {
  const named = { ...donation, memberName: donorNameOnRecord(donation, viewer) };
  return seesSupporterName(viewer, donation) ? named : withoutFields(named, HIDDEN_ON_A_DONATION);
}
