import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ByAccount from "./ByAccount";
import { byAccount as texts } from "@/lib/texts";
import { NO_ACCOUNT, type MethodLedger } from "@/lib/accountLedger";

function line(over: Partial<MethodLedger["accounts"][number]> = {}) {
  return { id: "a1", code: "111111", label: null, closed: false, received: 100, paid: 0, ...over };
}

function answering(methods: MethodLedger[]) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ methods }),
  })) as unknown as typeof fetch;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the treasury broken down by number", () => {
  it("shows each number under its method", async () => {
    globalThis.fetch = answering([
      {
        method: "بنكيلي",
        received: 140,
        paid: 0,
        accounts: [line(), line({ id: "a2", code: "222222", received: 40 })],
      },
    ]);
    render(<ByAccount />);

    await waitFor(() => expect(screen.getByText("111111")).toBeDefined());
    expect(screen.getByText("222222")).toBeDefined();
    expect(screen.getByText("بنكيلي")).toBeDefined();
  });

  it("names the line for money nobody could place", async () => {
    globalThis.fetch = answering([
      {
        method: "بنكيلي",
        received: 90,
        paid: 0,
        accounts: [line({ id: NO_ACCOUNT, code: null, received: 90 })],
      },
    ]);
    render(<ByAccount />);

    await waitFor(() => expect(screen.getByText(texts.noAccount)).toBeDefined());
  });

  it("says which number has closed", async () => {
    globalThis.fetch = answering([
      { method: "بنكيلي", received: 70, paid: 0, accounts: [line({ closed: true })] },
    ]);
    render(<ByAccount />);

    await waitFor(() => expect(screen.getByText(new RegExp(texts.closed))).toBeDefined());
  });

  it("offers a period to read over", async () => {
    globalThis.fetch = answering([]);
    render(<ByAccount />);

    expect(screen.getByLabelText(texts.from)).toBeDefined();
    expect(screen.getByLabelText(texts.to)).toBeDefined();
  });

  it("says so when there is nothing to show", async () => {
    globalThis.fetch = answering([]);
    render(<ByAccount />);

    await waitFor(() => expect(screen.getByText(texts.empty)).toBeDefined());
  });

  it("says so when it could not be read", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    render(<ByAccount />);

    await waitFor(() => expect(screen.getByText(texts.failed)).toBeDefined());
  });
});
