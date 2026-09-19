import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { offeredMethodNames } from "@/lib/paymentMethodsServer";
import { donationCreateSchema } from "./schema";
import { donationView } from "@/lib/donationView";
import { logLabelFor, logSnapshotFor } from "@/lib/auditSupport";
import { viewerOf } from "@/lib/supportViewer";
import { donorNameOnRecord } from "@/lib/donorName";
import { money } from "@/lib/money";
import { createGift } from "@/lib/giftWriteServer";

export const POST = withRoute("POST /api/admin/donations", async (req: NextRequest) => {
  const session = await requireAdminRole("SUPER");
  const viewer = viewerOf(session);
  const input = parse(donationCreateSchema(await offeredMethodNames()), await req.json());

  const gift = await createGift(input);

  await logAction(
    session.username,
    "CREATE_DONATION_MANUAL",
    logLabelFor(gift, `${donorNameOnRecord(gift, viewer)} — ${money(input.amount)}`),
    {
      ...auditContext(session, req),
      targetType: "Donation",
      targetId: gift.id,
      after: logSnapshotFor(gift, {
        anonymous: gift.anonymous,
        donorName: gift.donorName,
        donorPhone: gift.donorPhone,
        amount: gift.amount,
        paymentMethod: gift.paymentMethod,
        accountId: gift.accountId,
        bankReference: gift.bankReference,
        status: gift.status,
        source: gift.source,
        userId: gift.userId,
      }),
    },
  );

  return NextResponse.json({ donation: donationView(gift, viewer) }, { status: 201 });
});
