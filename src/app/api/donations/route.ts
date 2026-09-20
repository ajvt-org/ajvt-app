import { NextRequest, NextResponse } from "next/server";
import { MAX_UPLOAD_SIZE, READABLE_UPLOAD_TYPES } from "@/lib/uploadLimits";
import { isRateLimited, recordFailedAttempt, getClientIp } from "@/lib/rateLimit";
import { getUserSession } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { HttpError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { common, money, uploads } from "@/lib/messages";
import { validateDonorChoice, donorNameFor } from "@/lib/donorChoice";
import {
  recordPublicDonation,
  requirePayableMethod,
  requireSupporterStanding,
} from "@/lib/publicDonationServer";
import { storeUploadImage } from "@/lib/uploadImageStore";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export const POST = withRoute("POST /api/donations", async (req: NextRequest) => {
  const key = `donate:${getClientIp(req)}`;
  if (isRateLimited(key, MAX_ATTEMPTS)) {
    throw new HttpError("RATE_LIMITED", 429, money.tooManyDonations);
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
  if (formData.get("memberId") !== null) throw new ValidationError(common.invalidBody);
  const paymentMethodRaw = formData.get("paymentMethod");

  if (!file) throw new ValidationError(money.proofRequired);
  if (!READABLE_UPLOAD_TYPES.includes(file.type)) {
    throw new ValidationError(uploads.unsupportedType);
  }
  if (file.size > MAX_UPLOAD_SIZE) throw new ValidationError(uploads.tooLarge);

  let selfUserId: string | null = null;
  let selfAnonymous = false;
  if (typeof userIdRaw === "string" && userIdRaw.trim()) {
    const session = await getUserSession();
    if (!session) throw new UnauthorizedError();
    const { userId } = session as { userId: string };
    await requireSupporterStanding(userIdRaw.trim(), userId);
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
      throw new ValidationError(choiceError ?? money.nameChoiceRequired);
    }
    anonymous = choice;
    donorName = donorNameFor(typed);
  }

  const amount = Number(amountRaw);
  if (!Number.isInteger(amount) || amount <= 0) throw new ValidationError(money.amountInvalid);

  const paymentMethod = await requirePayableMethod(paymentMethodRaw);
  const { id, filename } = await storeUploadImage(file);

  await recordPublicDonation({
    id,
    amount,
    paymentMethod,
    proof: filename,
    anonymous,
    donorName,
    userId: selfUserId,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
});
