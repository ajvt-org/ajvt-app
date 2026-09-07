import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PendingAgeGroups from "./PendingAgeGroups";
import { confirmDialog, pendingAgeGroups as texts } from "@/lib/texts";
import type { AgeGroup } from "./types";

const GROUP: AgeGroup = { id: "g1", name: "الرواد", count: 4, approved: false };

function show() {
  const onChanged = vi.fn();
  render(<PendingAgeGroups groups={[GROUP]} onChanged={onChanged} />);
  return onChanged;
}

function stubFetch() {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("refusing an age group a member proposed", () => {
  it("asks through the app rather than through the browser", async () => {
    const asked = vi.fn();
    vi.stubGlobal("confirm", asked);
    stubFetch();
    show();

    await userEvent.click(screen.getByRole("button", { name: texts.reject }));

    expect(asked).not.toHaveBeenCalled();
    expect(screen.getByText(texts.confirmReject)).toBeTruthy();
  });

  it("sends nothing until the reader answers", async () => {
    const fetchMock = stubFetch();
    show();

    await userEvent.click(screen.getByRole("button", { name: texts.reject }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses it once the reader says so", async () => {
    const fetchMock = stubFetch();
    show();

    await userEvent.click(screen.getByRole("button", { name: texts.reject }));
    const [, inDialog] = screen.getAllByRole("button", { name: texts.reject });
    await userEvent.click(inDialog);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toContain("/api/admin/age-groups/g1");
  });

  it("sends nothing when the reader backs out", async () => {
    const fetchMock = stubFetch();
    show();

    await userEvent.click(screen.getByRole("button", { name: texts.reject }));
    await userEvent.click(screen.getByRole("button", { name: confirmDialog.cancel }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(texts.confirmReject)).toBeNull();
  });
});
