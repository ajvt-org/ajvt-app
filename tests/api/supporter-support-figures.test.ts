import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import {
  resetDb,
  get,
  createUser,
  createAdmin,
  signInAsAdmin,
  withId,
  withParams,
  makeMember,
} from "./helpers";
import { ensureReceiptsFor } from "@/lib/paymentReceiptServer";

import { GET as LIST_MEMBERS } from "@/app/api/admin/members/route";
import { GET as PROFILE } from "@/app/api/admin/members/[id]/profile/route";
import { GET as MEMBERSHIPS } from "@/app/api/admin/members/[id]/memberships/route";
import { GET as ACCOUNT_RECEIPTS } from "@/app/api/admin/members/[id]/receipts/route";
import { GET as EXPORT } from "@/app/api/admin/export/[dataset]/route";

const GIVER = "الكريم ولد الساتر";
const SURPLUS = 4900;

async function marked(confidential = true) {
  const user = await createUser("44001122");
  const person = await prisma.user.update({
    where: { id: user.id },
    data: { fullName: GIVER, supportNameConfidential: confidential },
  });
  await makeMember({
    userId: person.id,
    status: "ACTIVE",
    paymentMethod: "بنكيلي",
    paidAmount: MEMBERSHIP_FEE + SURPLUS,
  });
  await ensureReceiptsFor(prisma, { userId: person.id, purpose: "MEMBERSHIP" });
  return person;
}

const asOrdinary = async () => signInAsAdmin(await createAdmin("boss", SUPER_ROLE));
const asOwner = async () => signInAsAdmin(await createAdmin("owner", OWNER_ROLE));

const rowFor = async (id: string) => {
  const { members } = await (await LIST_MEMBERS(get("/api/admin/members"))).json();
  return members.find((m: { id: string }) => m.id === id);
};

const profileOf = async (id: string) =>
  (await (await PROFILE(get(`/api/admin/members/${id}/profile`), withId(id))).json()).member;

describe("the support figure beside a confidential name", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("reads zero on the member list, with the fee and the name still there", async () => {
    const giver = await marked();
    await asOrdinary();

    const row = await rowFor(giver.id);

    expect(row.supportAmount).toBe(0);
    expect(row.paidAmount).toBe(MEMBERSHIP_FEE);
    expect(row.fullName).toBe(GIVER);
  });

  it("reads the real figure on the member list for the role that holds the promise", async () => {
    const giver = await marked();
    await asOwner();

    expect((await rowFor(giver.id)).supportAmount).toBe(SURPLUS);
  });

  it("reads zero on his account page and lists none of his gifts", async () => {
    const giver = await marked();
    await asOrdinary();

    const member = await profileOf(giver.id);

    expect(member.supportAmount).toBe(0);
    expect(member.donations).toEqual([]);
    expect(member.fullName).toBe(GIVER);
  });

  it("reads the real figure and his gifts for the role that holds the promise", async () => {
    const giver = await marked();
    await asOwner();

    const member = await profileOf(giver.id);

    expect(member.supportAmount).toBe(SURPLUS);
  });

  it("reads zero on the membership year list", async () => {
    const giver = await marked();
    await asOrdinary();

    const { memberships } = await (
      await MEMBERSHIPS(get(`/api/admin/members/${giver.id}/memberships`), withId(giver.id))
    ).json();

    expect(memberships[0].supportAmount).toBe(0);
    expect(memberships[0].paidAmount).toBe(MEMBERSHIP_FEE);
  });

  it("keeps his support receipt off his account page", async () => {
    const giver = await marked();
    await asOrdinary();

    const { receipts } = await (
      await ACCOUNT_RECEIPTS(get(`/api/admin/members/${giver.id}/receipts`), withId(giver.id))
    ).json();

    expect(receipts).toEqual([]);
  });

  it("shows his receipt on his account page to the role that holds the promise", async () => {
    const giver = await marked();
    await asOwner();

    const { receipts } = await (
      await ACCOUNT_RECEIPTS(get(`/api/admin/members/${giver.id}/receipts`), withId(giver.id))
    ).json();

    expect(receipts).toHaveLength(1);
    expect(receipts[0].payerName).toBe(GIVER);
  });

  it("exports the fee as the whole of what he paid, with no support beside it", async () => {
    await marked();
    await asOrdinary();

    const csv = await (
      await EXPORT(get("/api/admin/export/members"), withParams({ dataset: "members" }))
    ).text();
    const line = csv.split("\n").find((row) => row.includes(GIVER)) ?? "";

    expect(line).not.toContain(String(SURPLUS));
    expect(line).not.toContain(String(MEMBERSHIP_FEE + SURPLUS));
    expect(line).toContain(String(MEMBERSHIP_FEE));
  });

  it("exports the real figure for the role that holds the promise", async () => {
    await marked();
    await asOwner();

    const csv = await (
      await EXPORT(get("/api/admin/export/members"), withParams({ dataset: "members" }))
    ).text();

    expect(csv).toContain(String(SURPLUS));
  });

  it("does not send the mark itself to an ordinary admin", async () => {
    await marked();
    await asOrdinary();

    const listed = await (await LIST_MEMBERS(get("/api/admin/members"))).text();

    expect(listed).not.toContain("supportNameConfidential");
  });

  it("leaves a member who is not marked exactly as they were", async () => {
    const plain = await marked(false);
    await asOrdinary();

    const row = await rowFor(plain.id);
    const member = await profileOf(plain.id);

    expect(row.supportAmount).toBe(SURPLUS);
    expect(member.supportAmount).toBe(SURPLUS);
  });
});
