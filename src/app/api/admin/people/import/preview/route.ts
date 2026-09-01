import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { PAYMENT_METHODS } from "@/lib/donations";
import { getAppSettings } from "@/lib/settingsServer";
import { villageNames } from "@/lib/villagesServer";
import { fileHashOf, lastImportOfFile } from "@/lib/importBatchServer";
import { parseMemberCsv } from "@/lib/memberImportParse";
import { checkRows } from "@/lib/memberImportCheck";
import { importContext } from "@/lib/memberImportServer";
import { villageChoices } from "@/lib/villages";
import { importPreviewSchema } from "./schema";

export const POST = withRoute("POST /api/admin/people/import/preview", async (req: NextRequest) => {
  await requireAdminRole("MEMBERS");
  const { fileName, content } = parse(importPreviewSchema, await req.json());

  const parsed = parseMemberCsv(content);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { membershipFee, membershipYear } = await getAppSettings();
  const names = await villageNames();
  const { people, ageGroupNames } = await importContext(membershipYear);

  const rows = checkRows(parsed.rows, {
    people,
    villageNames: names,
    ageGroupNames,
    membershipFee,
    paymentMethods: PAYMENT_METHODS,
  });

  const fileHash = fileHashOf(content);
  const previous = await lastImportOfFile(fileHash);

  return NextResponse.json({
    batchId: randomUUID(),
    fileHash,
    fileName,
    rows,
    unknownColumns: parsed.unknownColumns,
    villages: villageChoices(names),
    ageGroups: ageGroupNames,
    membershipFee,
    paymentMethods: PAYMENT_METHODS,
    previousImport: previous && { createdAt: previous.createdAt, createdBy: previous.createdBy },
  });
});
