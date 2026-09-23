import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ActivitySupporters from "./ActivitySupporters";
import { activityPage, supporters } from "@/lib/texts";
import { moneyDigits } from "@/lib/money";

const row = { rank: 1, position: 1, name: "محمد", photoUrl: null, total: 5000, anonymous: false };

function serving(board: { rows: (typeof row)[]; total: number; given: number }) {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => board }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("an activity's supporters", () => {
  it("reads the board from the activity's own admin route", async () => {
    const fetchMock = serving({ rows: [row], total: 1, given: 7000 });
    render(<ActivitySupporters activityId="a1" />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/activities/a1/supporters"),
    );
  });

  it("says nobody has given yet instead of drawing an empty table", async () => {
    serving({ rows: [], total: 0, given: 0 });
    render(<ActivitySupporters activityId="a1" />);

    expect(await screen.findByText(activityPage.supportersEmpty)).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("lists who gave and what the activity was given", async () => {
    serving({ rows: [row], total: 1, given: 7000 });
    render(<ActivitySupporters activityId="a1" />);

    expect(await screen.findByText("محمد")).toBeDefined();
    const heading = screen.getByRole("heading", { name: activityPage.supportersHeading });
    expect(heading.parentElement?.textContent).toContain(moneyDigits(7000));
  });

  it("pages from the activity's own board", async () => {
    const fetchMock = serving({ rows: [row], total: 2, given: 7000 });
    render(<ActivitySupporters activityId="a1" />);

    fireEvent.click(await screen.findByRole("button", { name: supporters.more }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/activities/a1/supporters?offset=1"),
    );
  });
});
