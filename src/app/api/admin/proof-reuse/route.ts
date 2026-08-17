import { NextRequest, NextResponse } from "next/server";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { findProofReuse, type ProofReuse } from "@/lib/proofReuse";

// Asked per screenshot rather than folded into the member list: a reviewer
// looks at one proof at a time, and the join behind this is three queries.
export const GET = withRoute("GET /api/admin/proof-reuse", async (req: NextRequest) => {
  await requireUnscopedAdmin();
  const filename = req.nextUrl.searchParams.get("filename");
  const kind = req.nextUrl.searchParams.get("kind") as ProofReuse["kind"] | null;
  const id = req.nextUrl.searchParams.get("id");

  const reuse = await findProofReuse(filename, kind && id ? { kind, id } : undefined);
  return NextResponse.json({ reuse });
});
