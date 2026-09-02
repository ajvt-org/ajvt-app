import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SupportPrivacyCard from "./SupportPrivacyCard";
import { supportPrivacy as texts } from "@/lib/texts";

function mockPut(namedEntries = 0) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ confidential: true, namedEntries }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setup(confidential = false, namedEntries = 0) {
  const onChanged = vi.fn();
  render(
    <SupportPrivacyCard
      memberId="u1"
      confidential={confidential}
      namedEntries={namedEntries}
      onChanged={onChanged}
    />,
  );
  return onChanged;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SupportPrivacyCard", () => {
  it("sends the tick to the route", async () => {
    const fetchMock = mockPut();
    setup();

    await userEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/members/u1/support-privacy");
    expect(JSON.parse(options.body)).toEqual({ confidential: true });
  });

  it("reports the entries that already name him", async () => {
    mockPut(3);
    setup();

    await userEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => expect(screen.getByText(texts.existingEntries(3))).toBeTruthy());
  });

  it("says so when nothing in the log names him", async () => {
    mockPut(0);
    setup();

    await userEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => expect(screen.getByText(texts.noExistingEntries)).toBeTruthy());
  });

  it("puts the box back when the route refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "لا" }) }),
    );
    setup();

    await userEvent.click(screen.getByRole("checkbox"));

    await waitFor(() =>
      expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false),
    );
  });

  it("shows the count for an account already ticked", () => {
    setup(true, 2);

    expect(screen.getByText(texts.existingEntries(2))).toBeTruthy();
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  });
});
