import { prisma } from "./prisma";
import { ForbiddenError, ValidationError } from "./errors";
import { members, money } from "./messages";
import { currentMembership } from "./currentMembershipServer";
import { asMembershipState } from "./currentMembership";
import { holdsMembership, membershipState } from "./membershipState";
import { getAppSettings } from "./settingsServer";
import { payableMethodNames } from "./paymentMethodsServer";
import { giftActivityId, takesGifts } from "./activityGifts";
import { giftPurpose } from "./giftPayment";

export async function requireSupporterStanding(claimed: string, signedIn: string): Promise<void> {
  const membership = claimed === signedIn ? await currentMembership(prisma, signedIn) : null;
  const { membershipYear } = await getAppSettings();
  const standing = membershipState(asMembershipState(membership), membershipYear);
  if (!membership || !holdsMembership(standing)) {
    throw new ForbiddenError(members.invalidMember);
  }
}

export async function requirePayableMethod(name: unknown): Promise<string> {
  const offered = await payableMethodNames();
  if (typeof name !== "string" || !offered.includes(name)) {
    throw new ValidationError(members.pickPaymentMethod);
  }
  return name;
}

export async function requireGiftableActivity(raw: unknown): Promise<string | null> {
  const id = giftActivityId(raw);
  if (!id) return null;
  const activity = await prisma.activity.findUnique({
    where: { id },
    select: { published: true, isOpen: true },
  });
  if (!activity || !takesGifts(activity)) throw new ValidationError(money.activityTakesNoGifts);
  return id;
}

export interface PublicDonation {
  id: string;
  amount: number;
  paymentMethod: string;
  proof: string;
  anonymous: boolean;
  donorName: string | null;
  userId: string | null;
  activityId: string | null;
}

export async function recordPublicDonation(donation: PublicDonation) {
  await prisma.payment.create({
    data: {
      id: donation.id,
      purpose: giftPurpose(donation),
      amount: donation.amount,
      method: donation.paymentMethod,
      proof: donation.proof,
      status: "PENDING",
      anonymous: donation.anonymous,
      source: donation.userId ? "SELF" : "PUBLIC",
      donorName: donation.donorName,
      userId: donation.userId,
      activityId: donation.activityId,
      paidOn: new Date(),
    },
  });
}
