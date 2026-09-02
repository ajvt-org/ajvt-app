import type { ActivityOption, DonationResponse, Proof } from "./paymentTypes";

export function proofFromDonation(
  donation: DonationResponse["donation"],
  activities: ActivityOption[],
): Proof {
  return {
    id: donation.id,
    kind: "DONATION",
    proof: donation.proof ?? null,
    memberName: donation.memberName,
    activityId: donation.activityId,
    activityTitle: activities.find((a) => a.id === donation.activityId)?.title ?? null,
    amount: donation.amount,
    status: donation.status,
    source: donation.source,
    paymentMethod: donation.paymentMethod,
    memberId: donation.memberId,
    userId: donation.userId,
    anonymous: donation.anonymous,
    donorName: donation.donorName ?? null,
    donorPhone: donation.donorPhone ?? null,
    donorPhoto: donation.donorPhoto ?? null,
    uploadedAt: donation.updatedAt,
    submittedAt: donation.createdAt,
  };
}
