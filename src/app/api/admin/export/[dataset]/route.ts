import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { NotFoundError } from "@/lib/errors";
import { common } from "@/lib/messages";
import { FILENAMES, isDataset } from "@/lib/exportRows";
import { datasetCsv } from "@/lib/exportServer";
import { viewerOf } from "@/lib/supportViewer";

export const GET = withRoute(
  "GET /api/admin/export/[dataset]",
  async (req: NextRequest, { params }: { params: Promise<{ dataset: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const { dataset } = await params;
    if (!isDataset(dataset)) throw new NotFoundError(common.exportNotFound);

    const csv = await datasetCsv(dataset, req.nextUrl.searchParams, viewerOf(session));
    const day = new Date().toISOString().slice(0, 10);

    await logAction(session.username, "EXPORT_DATA", dataset, {
      ...auditContext(session, req),
      targetType: "Export",
      targetId: dataset,
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${FILENAMES[dataset]}-${day}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  },
);
