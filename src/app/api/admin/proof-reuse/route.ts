import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { withRoute } from "@/lib/route";
import { findProofReuse, type ProofReuse } from "@/lib/proofReuse";
import { viewerOf } from "@/lib/supportViewer";

export const GET = withRoute("GET /api/admin/proof-reuse", async (req: NextRequest) => {
  const session = await requireArea(MONEY_AREAS.payments);
  const filename = req.nextUrl.searchParams.get("filename");
  const kind = req.nextUrl.searchParams.get("kind") as ProofReuse["kind"] | null;
  const id = req.nextUrl.searchParams.get("id");

  const reuse = await findProofReuse(
    filename,
    viewerOf(session),
    kind && id ? { kind, id } : undefined,
  );
  return NextResponse.json({ reuse });
});
