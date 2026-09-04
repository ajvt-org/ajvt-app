import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import PaymentInfoBanner from "./PaymentInfoBanner";

const METHOD = "بنكيلي";
const CODE = "111111";
const ADMIN_ONLY = "نقداً";

function answering(methods: unknown[]) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ methods }),
  })) as unknown as typeof fetch;
}

function failing() {
  return vi.fn(async () => {
    throw new Error("offline");
  }) as unknown as typeof fetch;
}

function pending() {
  return vi.fn(() => new Promise<never>(() => {})) as unknown as typeof fetch;
}

const OPEN = {
  name: METHOD,
  memberFacing: true,
  accounts: [{ id: "a1", code: CODE, label: null }],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the payment information on the donate screen", () => {
  it("shows the number a method receives into", async () => {
    globalThis.fetch = answering([OPEN]);
    render(<PaymentInfoBanner />);
    await waitFor(() => expect(screen.getByText(CODE)).toBeDefined());
    expect(screen.getByText(METHOD)).toBeDefined();
  });

  it("shows no number while it is still asking", () => {
    globalThis.fetch = pending();
    render(<PaymentInfoBanner />);
    expect(screen.queryByText(CODE)).toBeNull();
    expect(screen.queryByText("نسخ")).toBeNull();
  });

  it("says so when it could not ask", async () => {
    globalThis.fetch = failing();
    render(<PaymentInfoBanner />);
    await waitFor(() => expect(screen.getByText(/تعذر/)).toBeDefined());
  });

  it("says so when nothing is on offer", async () => {
    globalThis.fetch = answering([]);
    render(<PaymentInfoBanner />);
    await waitFor(() => expect(screen.getByText(/لا توجد/)).toBeDefined());
  });

  it("leaves out a method an admin stopped, code and all", async () => {
    globalThis.fetch = answering([{ name: METHOD, memberFacing: true, accounts: [] }]);
    render(<PaymentInfoBanner />);
    await waitFor(() => expect(screen.queryByText(METHOD)).toBeNull());
    expect(screen.queryByText(CODE)).toBeNull();
  });

  it("never advertises an admin only method", async () => {
    globalThis.fetch = answering([
      { name: ADMIN_ONLY, memberFacing: false, accounts: [{ id: "a2", code: CODE, label: null }] },
    ]);
    render(<PaymentInfoBanner />);
    await waitFor(() => expect(screen.queryByText(ADMIN_ONLY)).toBeNull());
  });

  it("keeps showing the note it was given", async () => {
    globalThis.fetch = answering([OPEN]);
    render(<PaymentInfoBanner note="ملاحظة" />);
    await waitFor(() => expect(screen.getByText("ملاحظة")).toBeDefined());
  });
});
