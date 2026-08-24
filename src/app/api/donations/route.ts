import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { getUploadDir } from "@/lib/uploadDir";
import { processImage, MAX_UPLOAD_SIZE, ALLOWED_UPLOAD_TYPES } from "@/lib/imageProcessing";
import { isRateLimited, recordFailedAttempt, getClientIp } from "@/lib/rateLimit";
import { getUserSession } from "@/lib/auth";
import { ONLINE_PAYMENT_METHODS } from "@/lib/donations";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import { common, members, money, uploads } from "@/lib/messages";
import { validateDonorChoice, donorNameFor } from "@/lib/donorChoice";
import { mirrorDonation } from "@/lib/paymentMirror";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export const POST = withRoute("POST /api/donations", async (req: NextRequest) => {
  const key = `donate:${getClientIp(req)}`;
  if (isRateLimited(key, MAX_ATTEMPTS)) {
    return NextResponse.json({ error: "محاولات كثيرة جداً، حاول لاحقاً" }, { status: 429 });
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
  const memberIdRaw = formData.get("memberId");
  const paymentMethodRaw = formData.get("paymentMethod");

  if (!file) return NextResponse.json({ error: "يرجى إرفاق صورة إثبات الدفع" }, { status: 400 });
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    return NextResponse.json({ error: uploads.unsupportedType }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: uploads.tooLarge }, { status: 400 });
  }

  let memberId: string | null = null;
  let selfName: string | null = null;
  let selfAnonymous = false;
  if (typeof memberIdRaw === "string" && memberIdRaw.trim()) {
    const session = await getUserSession();
    if (!session) return NextResponse.json({ error: common.unauthorized }, { status: 401 });
    const { userId } = session as { userId: string };
    const member = await prisma.member.findUnique({
      where: { id: memberIdRaw.trim() },
      select: { userId: true, status: true, fullName: true },
    });
    if (!member || member.userId !== userId || member.status !== "ACTIVE") {
      return NextResponse.json({ error: "عضو غير صالح" }, { status: 403 });
    }
    memberId = memberIdRaw.trim();
    selfName = member.fullName;
    selfAnonymous = formData.get("anonymous") === "true";
  }

  let donorName: string | null = selfAnonymous ? null : selfName;
  if (!memberId) {
    const anonymousRaw = formData.get("anonymous");
    const anonymous = anonymousRaw === "true" ? true : anonymousRaw === "false" ? false : null;
    const typed = typeof donorNameRaw === "string" ? donorNameRaw : "";
    const choiceError = validateDonorChoice(anonymous, typed);
    if (choiceError || anonymous === null) {
      return NextResponse.json({ error: choiceError ?? money.nameChoiceRequired }, { status: 400 });
    }
    donorName = donorNameFor(anonymous, typed);
  }

  const n = Number(amountRaw);
  if (!Number.isInteger(n) || n <= 0) {
    return NextResponse.json({ error: money.amountInvalid }, { status: 400 });
  }
  const amount = n;

  if (typeof paymentMethodRaw !== "string" || !ONLINE_PAYMENT_METHODS.includes(paymentMethodRaw)) {
    return NextResponse.json({ error: members.pickPaymentMethod }, { status: 400 });
  }
  const paymentMethod = paymentMethodRaw;

  const id = uuidv4();
  const filename = `${id}.webp`;
  const uploadDir = getUploadDir();
  let processed;
  try {
    processed = await processImage(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    logger.error("image.processing.error", err);
    return NextResponse.json({ error: uploads.processingFailed }, { status: 400 });
  }
  await mkdir(uploadDir, { recursive: true });
  await Promise.all([
    writeFile(join(/* turbopackIgnore: true */ uploadDir, filename), processed.full),
    writeFile(join(/* turbopackIgnore: true */ uploadDir, `${id}-thumb.webp`), processed.thumbnail),
  ]);

  const donation = await prisma.donation.create({
    data: {
      donorName,
      amount,
      paymentMethod,
      proof: filename,
      memberId,
      source: memberId ? "SELF" : "PUBLIC",
      status: "PENDING",
    },
  });
  await mirrorDonation(prisma, {
    donationId: donation.id,
    amount,
    method: paymentMethod,
    proof: filename,
    status: "PENDING",
    donorName,
    donorPhoto: null,
    donorPhone: null,
    memberId,
    activityId: null,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
});
