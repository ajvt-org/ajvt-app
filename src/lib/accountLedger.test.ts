import { describe, it, expect } from "vitest";
import { NO_ACCOUNT, ledgerOf, type AccountRef, type AccountSum } from "./accountLedger";

const ONLINE = "بنكيلي";
const CASH = "نقداً";
const UNNAMED = "غير محدد";

function account(over: Partial<AccountRef> = {}): AccountRef {
  return { id: "a1", code: "111111", label: null, closedAt: null, method: ONLINE, ...over };
}

const OPEN = account();
const CLOSED = account({ id: "a2", code: "222222", closedAt: new Date("2026-06-30") });

function received(over: Partial<AccountSum> = {}): AccountSum {
  return { method: ONLINE, accountId: OPEN.id, amount: 100, ...over };
}

function ledger(income: AccountSum[], spending: AccountSum[] = [], accounts = [OPEN, CLOSED]) {
  return ledgerOf(income, spending, accounts, [ONLINE, CASH], UNNAMED);
}

describe("what each number received and paid out", () => {
  it("adds up the money that landed in one number", () => {
    const rows = ledger([received(), received({ amount: 50 })]);
    expect(rows[0].accounts[0].received).toBe(150);
  });

  it("keeps money out separate from money in", () => {
    const rows = ledger([received({ amount: 100 })], [received({ amount: 30 })]);
    expect(rows[0].accounts[0].received).toBe(100);
    expect(rows[0].accounts[0].paid).toBe(30);
  });

  it("shows a number that only paid out, and nothing came in", () => {
    const rows = ledger([], [received({ amount: 30 })]);
    expect(rows[0].accounts[0].received).toBe(0);
    expect(rows[0].accounts[0].paid).toBe(30);
  });

  it("adds each number up to its method", () => {
    const rows = ledger([
      received({ accountId: OPEN.id, amount: 100 }),
      received({ accountId: CLOSED.id, amount: 40 }),
    ]);
    expect(rows[0].received).toBe(140);
    expect(rows[0].accounts).toHaveLength(2);
  });
});

describe("a number that has been closed", () => {
  it("still appears for the period it was open", () => {
    const rows = ledger([received({ accountId: CLOSED.id, amount: 70 })]);
    const line = rows[0].accounts.find((a) => a.id === CLOSED.id);
    expect(line?.received).toBe(70);
    expect(line?.closed).toBe(true);
  });

  it("is not counted as open", () => {
    const rows = ledger([received(), received({ accountId: CLOSED.id })]);
    expect(rows[0].accounts.filter((a) => a.closed)).toHaveLength(1);
  });
});

describe("money that landed nowhere anybody knows", () => {
  it("gets its own line rather than disappearing", () => {
    const rows = ledger([received({ accountId: null, amount: 90 })]);
    const line = rows[0].accounts.find((a) => a.id === NO_ACCOUNT);
    expect(line?.received).toBe(90);
    expect(line?.code).toBeNull();
  });

  it("sits last under its method, after the numbers", () => {
    const rows = ledger([received(), received({ accountId: null })]);
    expect(rows[0].accounts.at(-1)?.id).toBe(NO_ACCOUNT);
  });

  it("is the only line a method paid in person can have", () => {
    const rows = ledger([received({ method: CASH, accountId: null, amount: 25 })]);
    const cash = rows.find((row) => row.method === CASH);
    expect(cash?.accounts).toEqual([
      { id: NO_ACCOUNT, code: null, label: null, closed: false, received: 25, paid: 0 },
    ]);
  });

  it("keeps money naming no method at all under its own heading", () => {
    const rows = ledger([received({ method: null, accountId: null, amount: 5 })]);
    expect(rows.find((row) => row.method === UNNAMED)?.received).toBe(5);
  });
});

describe("the lines under a method", () => {
  it("sum to the method total, so the numbers add up", () => {
    const rows = ledger([
      received({ amount: 100 }),
      received({ accountId: CLOSED.id, amount: 40 }),
      received({ accountId: null, amount: 7 }),
    ]);
    const total = rows[0].accounts.reduce((sum, line) => sum + line.received, 0);
    expect(total).toBe(rows[0].received);
    expect(rows[0].received).toBe(147);
  });

  it("read in the order an admin set the methods in", () => {
    const rows = ledger([
      received({ method: CASH, accountId: null, amount: 900 }),
      received({ amount: 1 }),
    ]);
    expect(rows.map((row) => row.method)).toEqual([ONLINE, CASH]);
  });

  it("follow the number a row points at rather than the name it carries", () => {
    const rows = ledger([received({ method: "اسم قديم", accountId: OPEN.id, amount: 12 })]);
    expect(rows[0].method).toBe(ONLINE);
    expect(rows[0].accounts[0].received).toBe(12);
  });

  it("are empty when there is no money at all", () => {
    expect(ledger([])).toEqual([]);
  });
});
