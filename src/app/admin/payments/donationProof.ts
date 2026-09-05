import { destinationTitle, type DestinationOption } from "@/lib/moneyDestination";
import type { DonationResponse, Proof } from "./paymentTypes";

export function proofFromDonation(
  donation: DonationResponse["donation"],
  destinations: DestinationOption[],
): Proof {
  return {
    id: donation.id,
    kind: "DONATION",
    proof: donation.proof ?? null,
    memberName: donation.memberName,
    activityId: donation.activityId,
    activityTitle: donation.activityId ? destinationTitle(destinations, donation.activityId) : null,
    competitionId: donation.competitionId,
    competitionName: donation.competitionId
      ? destinationTitle(destinations, donation.competitionId)
      : null,
    amount: donation.amount,
    status: donation.status,
    source: donation.source,
    paymentMethod: donation.paymentMethod,
    accountId: donation.accountId,
    bankReference: donation.bankReference,
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
