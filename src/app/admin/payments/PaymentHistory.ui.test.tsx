import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentHistory from "./PaymentHistory";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => get(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ history: [] });
});

describe("the history box on a payment card", () => {
  it("asks for nothing until it is opened, so a page of cards costs one request each", () => {
    render(<PaymentHistory kind="MEMBERSHIP" id="u1" />);

    expect(get).not.toHaveBeenCalled();
  });

  it("fetches the history once it is opened", async () => {
    render(<PaymentHistory kind="MEMBERSHIP" id="u1" />);

    await userEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(get).toHaveBeenCalled());
  });
});
