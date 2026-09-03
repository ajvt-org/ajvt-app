import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { SUPER_ROLE } from "@/lib/adminRoles";
import { SUPPORTERS_PAGE_SIZE } from "@/lib/donationsServer";
import { resetDb, get, post, createUser, createAdmin, signInAsAdmin } from "./helpers";

import { POST as CREATE_DONATION } from "@/app/api/admin/donations/route";
import { GET as PAYMENT_PROOFS } from "@/app/api/admin/payment-proofs/route";
import { GET as BOARD } from "@/app/api/admin/supporters/route";

interface Row {
  name: string;
  total: number;
  rank: number;
}

interface Board {
  rows: Row[];
  count: number;
  given: number;
}

async function board(query = ""): Promise<Board> {
  const response = await BOARD(get(`/api/admin/supporters${query}`));
  expect(response.status).toBe(200);
  return response.json();
}

async function account(fullName: string, phone: string) {
  const user = await createUser(phone);
  return prisma.user.update({ where: { id: user.id }, data: { fullName } });
}

async function gift(amount: number, donorName: string, userId: string | null = null) {
  const made = await CREATE_DONATION(post("/api/admin/donations", { donorName, amount, userId }));
  expect(made.status).toBe(201);
}

async function nameOnPaymentsList(): Promise<string[]> {
  const response = await PAYMENT_PROOFS(get("/api/admin/payment-proofs"));
  const body = (await response.json()) as { proofs: { memberName: string }[] };
  return body.proofs.map((proof) => proof.memberName);
}

describe("the admin supporters board", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));
  });

  it("counts the supporters and adds up everything they gave", async () => {
    await gift(500, "أحمد");
    await gift(300, "سالم");
    await gift(200, "خديجة");

    const { count, given } = await board();

    expect(count).toBe(3);
    expect(given).toBe(1000);
  });

  it("counts a supporter once however often they gave", async () => {
    await gift(500, "أحمد");
    await gift(300, "أحمد");

    const { count, given, rows } = await board();

    expect(count).toBe(1);
    expect(given).toBe(800);
    expect(rows[0].total).toBe(800);
  });

  it("answers an empty board with nothing given", async () => {
    const { rows, count, given } = await board();

    expect(rows).toEqual([]);
    expect(count).toBe(0);
    expect(given).toBe(0);
  });

  it("ranks the board by what each supporter gave", async () => {
    await gift(200, "خديجة");
    await gift(500, "أحمد");
    await gift(300, "سالم");

    const { rows } = await board();

    expect(rows.map((row) => row.name)).toEqual(["أحمد", "سالم", "خديجة"]);
  });

  it("hands back one page at a time and keeps the count of the whole board", async () => {
    const supporters = SUPPORTERS_PAGE_SIZE + 5;
    for (let i = 0; i < supporters; i++) await gift(100 + i, `داعم ${i}`);

    const first = await board();
    const second = await board(`?offset=${SUPPORTERS_PAGE_SIZE}`);

    expect(first.rows).toHaveLength(SUPPORTERS_PAGE_SIZE);
    expect(second.rows).toHaveLength(5);
    expect(first.count).toBe(supporters);
    expect(second.count).toBe(supporters);
  });

  it("keeps the grand total whole on a page that shows part of the board", async () => {
    const supporters = SUPPORTERS_PAGE_SIZE + 5;
    let expected = 0;
    for (let i = 0; i < supporters; i++) {
      expected += 100 + i;
      await gift(100 + i, `داعم ${i}`);
    }

    expect((await board()).given).toBe(expected);
  });

  it("names a linked supporter the way the payments list names them", async () => {
    const giver = await account("أبوبكر لمرابط", "44001122");
    await gift(2000, "ابو", giver.id);

    const { rows } = await board();

    expect(rows[0].name).toBe("أبوبكر لمرابط");
    expect(await nameOnPaymentsList()).toContain("أبوبكر لمرابط");
  });

  it("gathers a linked supporter's gifts into the one row whatever they were named", async () => {
    const giver = await account("أبوبكر لمرابط", "44001122");
    await gift(500, "ابو", giver.id);
    await gift(300, "أبوبكر", giver.id);

    const { rows, count } = await board();

    expect(count).toBe(1);
    expect(rows[0].name).toBe("أبوبكر لمرابط");
    expect(rows[0].total).toBe(800);
  });
});
