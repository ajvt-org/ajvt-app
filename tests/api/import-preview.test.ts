import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/people/import/preview/route";
import { MAX_FILE_BYTES } from "@/app/api/admin/people/import/preview/schema";
import { prisma } from "@/lib/prisma";
import { memberImportErrors } from "@/lib/messages";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import { claimImportBatch, fileHashOf } from "@/lib/importBatchServer";
import type { CheckedRow } from "@/lib/memberImportCheck";
import { resetDb, post, createAdmin, signInAsAdmin } from "./helpers";

const AGE = "البدريين";
const HEADERS = "الاسم الكامل,الهاتف,القرية,العصر,طريقة الدفع,المبلغ المدفوع,دفع الاشتراك";

interface Preview {
  batchId: string;
  fileHash: string;
  rows: CheckedRow[];
  unknownColumns: string[];
  villages: string[];
  ageGroups: string[];
  membershipFee: number;
  previousImport: { createdBy: string } | null;
}

async function asMembersAdmin() {
  await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));
}

function preview(content: string, fileName = "members.csv") {
  return POST(post("/api/admin/people/import/preview", { fileName, content }));
}

async function body(response: Response): Promise<Preview & { error?: string }> {
  return response.json();
}

describe("POST /api/admin/people/import/preview", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.ageGroup.create({ data: { name: AGE, approved: true } });
    await prisma.village.create({ data: { name: "بوغرابة" } });
  });

  it("refuses an anonymous caller", async () => {
    expect((await preview(`${HEADERS}\nمحمد,,,,,,`)).status).toBe(401);
  });

  it("refuses an admin scoped to another section", async () => {
    await signInAsAdmin(await createAdmin("activities-admin", "ACTIVITIES"));

    expect((await preview(`${HEADERS}\nمحمد,,,,,,`)).status).toBe(403);
  });

  it("reads a clean file and answers with a checked row per line", async () => {
    await asMembersAdmin();

    const response = await preview(
      `${HEADERS}\nمحمد ولد أحمد,36000123,${HOME_VILLAGE},${AGE},نقداً,100,نعم`,
    );
    const data = await body(response);

    expect(response.status).toBe(200);
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0].issues).toEqual([]);
    expect(data.rows[0].values.paid).toBe(true);
    expect(data.batchId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sends back the villages and age groups the window offers", async () => {
    await asMembersAdmin();

    const data = await body(await preview(`${HEADERS}\nمحمد,,,,,,`));

    expect(data.villages).toEqual([HOME_VILLAGE, "بوغرابة", OTHER_VILLAGE]);
    expect(data.ageGroups).toEqual([AGE]);
    expect(data.membershipFee).toBe(100);
  });

  it("flags a home village row with no age group", async () => {
    await asMembersAdmin();

    const data = await body(await preview(`${HEADERS}\nمحمد ولد أحمد,,${HOME_VILLAGE},,,,`));

    expect(data.rows[0].issues.some((issue) => issue.blocking)).toBe(true);
  });

  it("matches a phone that already belongs to an account", async () => {
    await asMembersAdmin();
    const account = await prisma.user.create({
      data: { phone: "36000123", fullName: "شخص موجود", village: HOME_VILLAGE, age: AGE },
    });

    const data = await body(await preview(`${HEADERS}\nمحمد,36000123,${HOME_VILLAGE},${AGE},,,`));

    expect(data.rows[0].match).toMatchObject({ kind: "phone", personId: account.id });
  });

  it("gives a fresh batch identifier to every preview of the same file", async () => {
    await asMembersAdmin();
    const file = `${HEADERS}\nمحمد,,${HOME_VILLAGE},${AGE},,,`;

    const first = await body(await preview(file));
    const second = await body(await preview(file));

    expect(first.batchId).not.toBe(second.batchId);
    expect(first.fileHash).toBe(second.fileHash);
  });

  it("says when the same file has been imported before", async () => {
    await asMembersAdmin();
    const file = `${HEADERS}\nمحمد,,${HOME_VILLAGE},${AGE},,,`;
    await claimImportBatch({
      id: "batch-earlier",
      fileHash: fileHashOf(file),
      fileName: "members.csv",
      rowCount: 1,
      createdBy: "another-admin",
    });

    const data = await body(await preview(file));

    expect(data.previousImport?.createdBy).toBe("another-admin");
  });

  it("says nothing about a file that has never been imported", async () => {
    await asMembersAdmin();

    const data = await body(await preview(`${HEADERS}\nمحمد,,${HOME_VILLAGE},${AGE},,,`));

    expect(data.previousImport).toBeNull();
  });

  it("refuses an empty file, a file with only headers and a file that is not a csv", async () => {
    await asMembersAdmin();

    expect((await body(await preview(""))).error).toBe(memberImportErrors.emptyFile);
    expect((await body(await preview(HEADERS))).error).toBe(memberImportErrors.headersOnly);
    expect((await body(await preview("%PDF-1.7\nbinary"))).error).toBe(
      memberImportErrors.noColumns,
    );
  });

  it("refuses a file with no name column", async () => {
    await asMembersAdmin();

    expect((await body(await preview("الهاتف\n36000123"))).error).toBe(
      memberImportErrors.missingName,
    );
  });

  it("refuses a file past the size limit", async () => {
    await asMembersAdmin();

    const response = await preview("x".repeat(MAX_FILE_BYTES + 1));

    expect(response.status).toBe(400);
    expect((await body(response)).error).toBe(memberImportErrors.fileTooBig);
  });

  it("writes nothing while previewing", async () => {
    await asMembersAdmin();
    await preview(`${HEADERS}\nمحمد ولد أحمد,36000123,${HOME_VILLAGE},${AGE},نقداً,100,نعم`);

    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.importBatch.count()).toBe(0);
    expect(await prisma.membership.count()).toBe(0);
  });
});
