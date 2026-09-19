import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { logAction, auditContext } from "@/lib/audit";
import { runMemberImport } from "@/lib/memberImportRunServer";
import { importRunSchema, type ImportRun } from "./schema";

export const POST = withRoute("POST /api/admin/people/import", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const run: ImportRun = parse(importRunSchema, await req.json());

  const { results, summary, membershipYear } = await runMemberImport(run, session);
  const context = auditContext(session, req);

  for (const result of results) {
    if (result.outcome === "failed") continue;
    await logAction(
      session.username,
      result.outcome === "created" ? "CREATE_PERSON" : "UPDATE_PERSON",
      result.fullName,
      {
        ...context,
        targetType: "User",
        targetId: result.personId,
        meta: { batchId: run.batchId, row: result.row },
      },
    );
    if (result.membership) {
      await logAction(session.username, "ADD_MEMBERSHIP", result.fullName, {
        ...context,
        targetType: "Member",
        targetId: result.personId,
        after: { status: "ACTIVE", year: membershipYear },
        meta: { batchId: run.batchId, row: result.row },
      });
    }
  }

  await logAction(session.username, "IMPORT_PEOPLE", run.fileName, {
    ...context,
    targetType: "ImportBatch",
    targetId: run.batchId,
    after: summary,
  });

  return NextResponse.json({ batchId: run.batchId, results, summary }, { status: 201 });
});
