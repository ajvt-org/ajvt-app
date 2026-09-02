import { NextRequest, NextResponse } from "next/server";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { findProofReuse, type ProofReuse } from "@/lib/proofReuse";
import { viewerOf } from "@/lib/supportViewer";

export const GET = withRoute("GET /api/admin/proof-reuse", async (req: NextRequest) => {
  const session = await requireUnscopedAdmin();
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
