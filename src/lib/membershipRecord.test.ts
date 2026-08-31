import { describe, it, expect, vi } from "vitest";
import { saveMembershipYear } from "@/lib/membershipRecord";

type Upsert = { where: unknown; update: Record<string, unknown>; create: Record<string, unknown> };

function db() {
  const upsert = vi.fn<(args: Upsert) => Promise<object>>(async () => ({}));
  return { upsert, client: { membership: { upsert } } as never };
}

describe("saveMembershipYear", () => {
  it("writes the year it was given, on the account it was given", async () => {
    const { upsert, client } = db();

    await saveMembershipYear(client, "u1", 2026, { paymentMethod: "بنكيلي" });

    expect(upsert).toHaveBeenCalledWith({
      where: { userId_year: { userId: "u1", year: 2026 } },
      update: { paymentMethod: "بنكيلي" },
      create: { userId: "u1", year: 2026, paymentMethod: "بنكيلي" },
    });
  });

  it("leaves out anything the edit did not touch", async () => {
    const { upsert, client } = db();

    await saveMembershipYear(client, "u1", 2026, {});

    expect(upsert.mock.calls[0][0].update).toEqual({});
  });

  it("carries a cleared proof rather than dropping it", async () => {
    const { upsert, client } = db();

    await saveMembershipYear(client, "u1", 2026, { paymentProof: null });

    expect(upsert.mock.calls[0][0].update).toEqual({ paymentProof: null });
  });
});
