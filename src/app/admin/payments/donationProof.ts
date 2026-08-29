import { donorNameOnRecord } from "@/lib/donorName";
import type { ActivityOption, DonationResponse, Proof } from "./paymentTypes";

export function proofFromDonation(
  donation: DonationResponse["donation"],
  activities: ActivityOption[],
  account?: { fullName: string } | null,
): Proof {
  return {
    id: donation.id,
    kind: "DONATION",
    proof: donation.proof,
    memberName: donorNameOnRecord({ donorName: donation.donorName, user: account ?? null }),
    activityId: donation.activityId,
    activityTitle: activities.find((a) => a.id === donation.activityId)?.title ?? null,
    amount: donation.amount,
    status: donation.status,
    source: donation.source,
    paymentMethod: donation.paymentMethod,
    memberId: donation.memberId,
    userId: donation.userId,
    anonymous: donation.anonymous,
    donorName: donation.donorName,
    donorPhone: donation.donorPhone,
    donorPhoto: donation.donorPhoto,
    uploadedAt: donation.updatedAt,
    submittedAt: donation.createdAt,
  };
}
