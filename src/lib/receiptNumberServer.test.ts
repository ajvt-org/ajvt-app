import { describe, it, expect, vi } from "vitest";
import { nextReceiptNumber } from "./receiptNumberServer";

function fakeDb(start = 0) {
  let value = start;
  return {
    counter: { upsert: vi.fn().mockImplementation(async () => ({ value: ++value })) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("taking the next number in a year's receipt sequence", () => {
  it("formats it with the year and the count the counter came back with", async () => {
    expect(await nextReceiptNumber(fakeDb(), 2026)).toBe("R-2026-0001");
    expect(await nextReceiptNumber(fakeDb(41), 2026)).toBe("R-2026-0042");
  });

  it("keeps a sequence of its own per year", async () => {
    const db = fakeDb();

    await nextReceiptNumber(db, 2026);
    await nextReceiptNumber(db, 2025);

    expect(
      db.counter.upsert.mock.calls.map((c: [{ where: { id: string } }]) => c[0].where.id),
    ).toEqual(["receipt:2026", "receipt:2025"]);
  });

  it("raises the counter by one rather than reading it and writing it back", async () => {
    const db = fakeDb();

    await nextReceiptNumber(db, 2026);

    expect(db.counter.upsert.mock.calls[0][0]).toMatchObject({
      update: { value: { increment: 1 } },
      create: { id: "receipt:2026", value: 1 },
    });
  });

  it("counts up across calls on one database", async () => {
    const db = fakeDb();

    const numbers = [
      await nextReceiptNumber(db, 2026),
      await nextReceiptNumber(db, 2026),
      await nextReceiptNumber(db, 2026),
    ];

    expect(numbers).toEqual(["R-2026-0001", "R-2026-0002", "R-2026-0003"]);
  });

  it("takes its database as a parameter, so a transaction can hold it", async () => {
    const tx = fakeDb();

    await nextReceiptNumber(tx, 2026);

    expect(tx.counter.upsert).toHaveBeenCalledTimes(1);
  });
});
