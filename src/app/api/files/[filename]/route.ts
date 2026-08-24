import { NextRequest, NextResponse } from "next/server";
import { getUserSession, requireAdmin } from "@/lib/auth";
import { isScopedRole } from "@/lib/activityAccess";
import { proofScope } from "@/lib/proofScope";
import { servePrivateUpload } from "@/lib/serveUpload";
import { locateUpload, type ProofKind } from "@/lib/uploadFields";

function adminAllowed(role: string, kind: ProofKind): boolean {
  if (kind === "photo") return true;
  if (kind === "expense") return !isScopedRole(role);
  return proofScope(role)[kind];
}

async function adminSession(): Promise<{ role: string } | null> {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  let admin: { role: string } | null;
  let userId: string | undefined;
  try {
    const [session, user] = await Promise.all([adminSession(), getUserSession()]);
    admin = session;
    userId = user ? (user as { userId?: string }).userId : undefined;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!admin && !userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { filename } = await params;
  return servePrivateUpload(filename, async (base) => {
    const match = await locateUpload(base);
    if (!match) return false;
    return (
      (!!admin && adminAllowed(admin.role, match.kind)) ||
      (match.kind === "photo" && !!userId) ||
      (!!userId && match.ownerId === userId)
    );
  });
}
