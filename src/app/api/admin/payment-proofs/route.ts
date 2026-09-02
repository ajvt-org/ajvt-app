import { NextResponse } from "next/server";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { listPaymentProofs } from "@/lib/paymentProofsServer";
import { viewerOf } from "@/lib/supportViewer";

export const GET = withRoute("GET /api/admin/payment-proofs", async () => {
  const session = await requireUnscopedAdmin();
  const proofs = await listPaymentProofs(viewerOf(session), session.role);
  return NextResponse.json({ proofs });
});
