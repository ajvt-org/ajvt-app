import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { listArchived } from "@/lib/deletedRecordsServer";
import { daysLeft } from "@/lib/deletedRecords";

export const GET = withRoute("GET /api/admin/deleted", async () => {
  await requireAdminRole("MEMBERS");
  const now = new Date();
  const records = await listArchived(now);

  return NextResponse.json({
    records: records.map((r) => ({
      id: r.id,
      kind: r.kind,
      label: r.label,
      deletedBy: r.deletedBy,
      deletedAt: r.deletedAt,
      daysLeft: daysLeft(r.expiresAt, now),
    })),
  });
});
