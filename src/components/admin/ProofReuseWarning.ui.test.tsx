import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProofReuseWarning from "./ProofReuseWarning";
import { proofReuse } from "@/lib/texts";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

function answer(reuse: unknown[]) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ reuse }) });
}

const ROW = { kind: "donation", id: "d1", label: "R-2026-0243", date: "2026-08-20T00:00:00.000Z" };

describe("the warning that a proof has been seen before", () => {
  it("says nothing when the proof has not been used elsewhere", async () => {
    answer([]);
    render(<ProofReuseWarning filename="p.webp" kind="member" id="u1" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText(new RegExp(proofReuse.title))).toBeNull();
  });

  it("names where the proof was seen only once it is opened", async () => {
    answer([{ ...ROW, date: "2026-08-20T00:00:00.000Z" }]);
    render(<ProofReuseWarning filename="p.webp" kind="member" id="u1" />);

    const control = await screen.findByRole("button");
    expect(screen.queryByText(/R-2026-0243/)).toBeNull();

    await userEvent.click(control);

    expect(screen.getByText(/R-2026-0243/)).toBeTruthy();
    expect(control.getAttribute("aria-expanded")).toBe("true");
  });
});
