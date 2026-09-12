import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_UPLOAD_SIZE, READABLE_UPLOAD_TYPES } from "@/lib/uploadLimits";
import { isRateLimited, recordFailedAttempt, getClientIp } from "@/lib/rateLimit";
import { getUserSession } from "@/lib/auth";
import { payableMethodNames } from "@/lib/paymentMethodsServer";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { common, members, money, uploads } from "@/lib/messages";
import { currentMembership } from "@/lib/currentMembershipServer";
import { asMembershipState } from "@/lib/currentMembership";
import { holdsMembership, membershipState } from "@/lib/membershipState";
import { validateDonorChoice, donorNameFor } from "@/lib/donorChoice";
import { getAppSettings } from "@/lib/settingsServer";
import { storeProofImage } from "./proofImage";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export const POST = withRoute("POST /api/donations", async (req: NextRequest) => {
  const key = `donate:${getClientIp(req)}`;
  if (isRateLimited(key, MAX_ATTEMPTS)) {
    return NextResponse.json({ error: money.tooManyDonations }, { status: 429 });
  }
  recordFailedAttempt(key, WINDOW_MS);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    throw new ValidationError(common.invalidBody);
  }

  const file = formData.get("file") as File | null;
  const donorNameRaw = formData.get("donorName");
  const amountRaw = formData.get("amount");
  const userIdRaw = formData.get("userId");
  if (formData.get("memberId") !== null) {
    return NextResponse.json({ error: common.invalidBody }, { status: 400 });
  }
  const paymentMethodRaw = formData.get("paymentMethod");

  if (!file) return NextResponse.json({ error: money.proofRequired }, { status: 400 });
  if (!READABLE_UPLOAD_TYPES.includes(file.type)) {
    return NextResponse.json({ error: uploads.unsupportedType }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: uploads.tooLarge }, { status: 400 });
  }

  let selfUserId: string | null = null;
  let selfAnonymous = false;
  if (typeof userIdRaw === "string" && userIdRaw.trim()) {
    const session = await getUserSession();
    if (!session) return NextResponse.json({ error: common.unauthorized }, { status: 401 });
    const { userId } = session as { userId: string };
    const membership = userIdRaw.trim() === userId ? await currentMembership(prisma, userId) : null;
    const { membershipYear } = await getAppSettings();
    const standing = membershipState(asMembershipState(membership), membershipYear);
    if (!membership || !holdsMembership(standing)) {
      return NextResponse.json({ error: members.invalidMember }, { status: 403 });
    }
    selfUserId = userId;
    selfAnonymous = formData.get("anonymous") === "true";
  }

  let anonymous = selfAnonymous;
  let donorName: string | null = null;
  if (!selfUserId) {
    const anonymousRaw = formData.get("anonymous");
    const choice = anonymousRaw === "true" ? true : anonymousRaw === "false" ? false : null;
    const typed = typeof donorNameRaw === "string" ? donorNameRaw : "";
    const choiceError = validateDonorChoice(choice, typed);
    if (choiceError || choice === null) {
      return NextResponse.json({ error: choiceError ?? money.nameChoiceRequired }, { status: 400 });
    }
    anonymous = choice;
    donorName = donorNameFor(typed);
  }

  const n = Number(amountRaw);
  if (!Number.isInteger(n) || n <= 0) {
    return NextResponse.json({ error: money.amountInvalid }, { status: 400 });
  }
  const amount = n;

  const offered = await payableMethodNames();
  if (typeof paymentMethodRaw !== "string" || !offered.includes(paymentMethodRaw)) {
    return NextResponse.json({ error: members.pickPaymentMethod }, { status: 400 });
  }
  const paymentMethod = paymentMethodRaw;

  const { id, filename } = await storeProofImage(file);

  await prisma.payment.create({
    data: {
      id,
      purpose: "DONATION",
      amount,
      method: paymentMethod,
      proof: filename,
      status: "PENDING",
      anonymous,
      source: selfUserId ? "SELF" : "PUBLIC",
      donorName,
      userId: selfUserId,
      paidOn: new Date(),
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
});
