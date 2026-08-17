import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { NotFoundError, ValidationError } from "@/lib/errors";

const MAX_TOTAL = 10000;

export const PATCH = withRoute(
  "PATCH /api/admin/age-groups/[id]/total",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { totalCount } = await req.json();

    if (!Number.isInteger(totalCount) || totalCount < 0 || totalCount > MAX_TOTAL) {
      throw new ValidationError("العدد الإجمالي غير صالح");
    }

    const existing = await prisma.ageGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("العصر غير موجود");

    const ageGroup = await prisma.ageGroup.update({ where: { id }, data: { totalCount } });
    await logAction(
      session.username,
      "UPDATE_AGE_GROUP",
      `${ageGroup.name} — العدد الإجمالي ${totalCount}`,
      {
        ...auditContext(session, req),
        targetType: "AgeGroup",
        targetId: ageGroup.id,
        before: { totalCount: existing.totalCount },
        after: { totalCount: ageGroup.totalCount },
      },
    );

    return NextResponse.json({ ageGroup });
  },
);
