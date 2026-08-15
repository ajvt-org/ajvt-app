import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { donationCreateSchema } from "./schema";

// Records a donation the admin collected outside the app (cash in hand,
// bank transfer confirmed by phone, etc.) — no proof screenshot required,
// the admin is the one vouching for it. Counted immediately (SUPER already
// confirmed it happened), same as manually-added members.
export const POST = withRoute("POST /api/admin/donations", async (req: NextRequest) => {
  const session = await requireAdminRole("SUPER");
  const { donorName, donorPhone, amount, proof, donorPhoto, paymentMethod } = parse(
    donationCreateSchema,
    await req.json(),
  );
  const n = Number(amount);

  const donation = await prisma.donation.create({
    data: {
      donorName,
      donorPhone: donorPhone?.trim() || null,
      amount: n,
      proof: proof || null,
      donorPhoto: donorPhoto || null,
      paymentMethod: paymentMethod || null,
      source: "PUBLIC",
      status: "ACTIVE",
    },
  });
  await logAction(session.username, "CREATE_DONATION_MANUAL", `${donorName} — ${n} أوقية`, {
    ...auditContext(session, req),
    targetType: "Donation",
    targetId: donation.id,
    after: {
      donorName: donation.donorName,
      donorPhone: donation.donorPhone,
      amount: donation.amount,
      paymentMethod: donation.paymentMethod,
      status: donation.status,
      source: donation.source,
    },
  });

  return NextResponse.json({ donation }, { status: 201 });
});
