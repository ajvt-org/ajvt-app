import { describe, it, expect, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/admin/expenses/route";
import { PATCH } from "@/app/api/admin/expenses/[id]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, patch, get, createAdmin, signInAsAdmin, withId } from "./helpers";
import { findProofReuse } from "@/lib/proofReuse";
import { PUBLIC_VIEWER } from "@/lib/supportPrivacy";

const ONE = "one.webp";
const TWO = "two.webp";
const THREE = "three.webp";

function patching(id: string, body: unknown) {
  return [patch(`/api/admin/expenses/${id}`, body), withId(id)] as const;
}

async function proofsOf(id: string): Promise<string[]> {
  const rows = await prisma.expenseProof.findMany({
    where: { expenseId: id },
    orderBy: { createdAt: "asc" },
    select: { filename: true },
  });
  return rows.map((row) => row.filename);
}

async function anExpense(proofs: string[] = []) {
  const res = await POST(
    post("/api/admin/expenses", { label: "إيجار الملعب", amount: 12000, proofs }),
  );
  return (await res.json()).expense as { id: string };
}

describe("several justificatifs on one expense", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("records an expense with none", async () => {
    const expense = await anExpense();

    expect(await proofsOf(expense.id)).toEqual([]);
  });

  it("records an expense with three at once", async () => {
    const expense = await anExpense([ONE, TWO, THREE]);

    expect(await proofsOf(expense.id)).toEqual([ONE, TWO, THREE]);
  });

  it("does not replace the first when a second is added", async () => {
    const expense = await anExpense([ONE]);

    await PATCH(...patching(expense.id, { proofs: [ONE, TWO] }));

    expect(await proofsOf(expense.id)).toEqual([ONE, TWO]);
  });

  it("removes one on its own and leaves the others", async () => {
    const expense = await anExpense([ONE, TWO, THREE]);

    await PATCH(...patching(expense.id, { proofs: [ONE, THREE] }));

    expect(await proofsOf(expense.id)).toEqual([ONE, THREE]);
  });

  it("takes them all off when the list is emptied", async () => {
    const expense = await anExpense([ONE, TWO]);

    await PATCH(...patching(expense.id, { proofs: [] }));

    expect(await proofsOf(expense.id)).toEqual([]);
  });

  it("leaves them alone when the edit does not mention them", async () => {
    const expense = await anExpense([ONE, TWO]);

    await PATCH(...patching(expense.id, { label: "إيجار الملعب البلدي" }));

    expect(await proofsOf(expense.id)).toEqual([ONE, TWO]);
  });

  it("keeps one row when the same file is sent twice", async () => {
    const expense = await anExpense([ONE, ONE]);

    expect(await proofsOf(expense.id)).toEqual([ONE]);
  });

  it("hands the list back when the expenses are read", async () => {
    await anExpense([ONE, TWO]);

    const { expenses } = await (await GET(get("/api/admin/expenses"))).json();

    expect(expenses[0].proofs.map((row: { filename: string }) => row.filename)).toEqual([ONE, TWO]);
  });

  it("keeps the old column pointing at the first, so anything still reading it is right", async () => {
    const expense = await anExpense([ONE, TWO]);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })).proof).toBe(ONE);

    await PATCH(...patching(expense.id, { proofs: [TWO] }));

    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })).proof).toBe(TWO);
  });
});

describe("the reuse warning across several justificatifs", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("fires on a repeated image that is not the first of its expense", async () => {
    await prisma.proofImage.createMany({
      data: [
        { filename: ONE, sha256: "aaa" },
        { filename: TWO, sha256: "shared" },
        { filename: THREE, sha256: "shared" },
      ],
    });
    const first = await anExpense([ONE, TWO]);
    const second = await anExpense([THREE]);

    const reuse = await findProofReuse(THREE, PUBLIC_VIEWER, {
      kind: "expense",
      id: second.id,
    });

    expect(reuse.map((row) => row.id)).toEqual([first.id]);
  });

  it("reports an expense once even when it holds the image twice over", async () => {
    await prisma.proofImage.createMany({
      data: [
        { filename: ONE, sha256: "shared" },
        { filename: TWO, sha256: "shared" },
        { filename: THREE, sha256: "shared" },
      ],
    });
    const first = await anExpense([ONE, TWO]);
    const second = await anExpense([THREE]);

    const reuse = await findProofReuse(THREE, PUBLIC_VIEWER, {
      kind: "expense",
      id: second.id,
    });

    expect(reuse.filter((row) => row.id === first.id)).toHaveLength(1);
  });
});
