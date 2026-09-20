import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ageGroupRows, createAgeGroup } from "@/lib/ageGroupsServer";

export const GET = withRoute("GET /api/admin/age-groups", async () => {
  await requireAdminRole("MEMBERS");

  return NextResponse.json(await ageGroupRows());
});

export const POST = withRoute("POST /api/admin/age-groups", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { name } = await req.json();

  const ageGroup = await createAgeGroup(name);
  await logAction(session.username, "CREATE_AGE_GROUP", ageGroup.name);

  return NextResponse.json({ ageGroup }, { status: 201 });
});
