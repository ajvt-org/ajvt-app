import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import RenewForm from "./RenewForm";
import { answering } from "@tests/ui/paymentMethods";
import { renewForm } from "@/lib/texts";

function mockFetch(membershipFee: number, settle = true) {
  const fetchMock = vi.fn(
    answering(async (url: unknown) => {
      if (typeof url === "string" && url.startsWith("/api/admin/settings")) {
        if (!settle) return new Promise(() => {});
        return {
          ok: true,
          status: 200,
          json: async () => ({ settings: { membershipFee, membershipYear: 2026 } }),
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const amount = () => screen.getByPlaceholderText(renewForm.amountPlaceholder);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the amount an admin may renew a member for", () => {
  it("takes its minimum from the club's configured fee", async () => {
    mockFetch(250);
    render(<RenewForm memberId="m1" year={2026} onRenewed={vi.fn()} />);

    await waitFor(() => expect(amount().getAttribute("min")).toBe("250"));
  });

  it("follows the fee wherever it is set rather than a number of its own", async () => {
    mockFetch(4000);
    render(<RenewForm memberId="m1" year={2026} onRenewed={vi.fn()} />);

    await waitFor(() => expect(amount().getAttribute("min")).toBe("4000"));
  });

  it("states no minimum while the fee is still unknown", () => {
    mockFetch(250, false);
    render(<RenewForm memberId="m1" year={2026} onRenewed={vi.fn()} />);

    expect(amount().getAttribute("min")).toBeNull();
  });
});
