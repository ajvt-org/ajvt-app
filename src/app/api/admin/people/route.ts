import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { adminPersonCreateSchema } from "./schema";
import { createPerson } from "@/lib/peopleServer";

export const POST = withRoute("POST /api/admin/people", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const input = parse(adminPersonCreateSchema, await req.json());

  const { person, tempPassword, phone } = await createPerson(input, session.adminId);

  await logAction(session.username, "CREATE_PERSON", input.fullName, {
    ...auditContext(session, req),
    targetType: "User",
    targetId: person.id,
    after: { fullName: input.fullName, age: person.age, village: input.village, phone },
  });

  return NextResponse.json({ person, tempPassword }, { status: 201 });
});
