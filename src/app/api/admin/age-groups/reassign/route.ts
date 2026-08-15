import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { withRoute } from "@/lib/route";

// Moves the members stranded on an old age value onto a group that exists.
// The target has to be a real group, otherwise this would just create a new
// orphan under a different name.
export const POST = withRoute("POST /api/admin/age-groups/reassign", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { from, to } = await req.json();

  if (!from?.trim() || !to?.trim()) {
    return NextResponse.json({ error: "العصر القديم والجديد مطلوبان" }, { status: 400 });
  }
  if (from.trim() === to.trim()) {
    return NextResponse.json({ error: "العصران متطابقان" }, { status: 400 });
  }

  const target = await prisma.ageGroup.findUnique({ where: { name: to.trim() } });
  if (!target) {
    return NextResponse.json({ error: "العصر الجديد غير موجود" }, { status: 404 });
  }

  const moved = await prisma.member.updateMany({
    where: { age: from.trim() },
    data: { age: target.name },
  });
  if (moved.count === 0) {
    return NextResponse.json({ error: "لا يوجد أعضاء بهذا العصر" }, { status: 404 });
  }

  await logAction(session.username, "REASSIGN_AGE_GROUP", `${from.trim()} → ${target.name}`, {
    adminId: session.adminId,
    adminRole: session.role,
    targetType: "AgeGroup",
    targetId: target.id,
    before: { name: from.trim() },
    after: { name: target.name },
    meta: { membersRenamed: moved.count },
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ moved: moved.count });
});
