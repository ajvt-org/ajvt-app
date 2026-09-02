import { NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { withRoute } from "@/lib/route";
import { listPaymentProofs } from "@/lib/paymentProofsServer";
import { viewerOf } from "@/lib/supportViewer";

export const GET = withRoute("GET /api/admin/payment-proofs", async () => {
  const session = await requireArea(MONEY_AREAS.payments);
  const proofs = await listPaymentProofs(viewerOf(session), session.role);
  return NextResponse.json({ proofs });
});
