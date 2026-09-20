import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { createVillage, villageRows } from "@/lib/villageAdminServer";

export const GET = withRoute("GET /api/admin/villages", async () => {
  await requireAdminRole("MEMBERS");

  return NextResponse.json(await villageRows());
});

export const POST = withRoute("POST /api/admin/villages", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { name } = await req.json();

  const village = await createVillage(name);
  await logAction(session.username, "CREATE_VILLAGE", village.name);

  return NextResponse.json({ village }, { status: 201 });
});
