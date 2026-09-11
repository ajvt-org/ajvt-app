import { describe, it, expect, beforeEach } from "vitest";
import { GET as MEMBERS } from "@/app/api/admin/members/route";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { resetDb, get, createAdmin, signInAsAdmin, makeMember } from "./helpers";

interface Row {
  fullName: string;
  recordedByAdmin: boolean;
  paymentProof: string | null;
  phone: string | null;
}

async function rows(): Promise<Row[]> {
  const response = await MEMBERS(get("/api/admin/members"));
  expect(response.status).toBe(200);
  return (await response.json()).members;
}

async function memberRecordedBy(fullName: string, recordedBy: string | null) {
  const member = await makeMember({
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    paidAmount: MEMBERSHIP_FEE,
  });
  await prisma.payment.updateMany({
    where: { userId: member.userId, purpose: "MEMBERSHIP" },
    data: { recordedBy },
  });
  return member;
}

describe("where a membership on the members list came from", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss"));
  });

  it("marks a membership carrying an admin username as an admin's", async () => {
    await memberRecordedBy("محمد", "boss");

    const [row] = await rows();

    expect(row.recordedByAdmin).toBe(true);
  });

  it("does not mark a membership the member signed up for themselves", async () => {
    await memberRecordedBy("سالم", "سالم");

    const [row] = await rows();

    expect(row.recordedByAdmin).toBe(false);
  });

  it("does not mistake a member who shares a name with an admin for one", async () => {
    await memberRecordedBy("boss", "boss المنتسب");

    const [row] = await rows();

    expect(row.recordedByAdmin).toBe(false);
  });

  it("treats a membership with no payment at all as an admin's", async () => {
    const member = await memberRecordedBy("خديجة", "boss");
    await prisma.payment.deleteMany({ where: { userId: member.userId, purpose: "MEMBERSHIP" } });

    const [row] = await rows();

    expect(row.recordedByAdmin).toBe(true);
  });

  it("keeps the raw name off the wire", async () => {
    await memberRecordedBy("محمد", "boss");

    const [row] = await rows();

    expect(JSON.stringify(row)).not.toContain('recordedBy"');
    expect("recordedBy" in row).toBe(false);
  });
});
