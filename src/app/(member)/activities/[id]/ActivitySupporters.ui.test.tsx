import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ActivitySupporters from "./ActivitySupporters";
import { activityPage, supporters } from "@/lib/texts";
import { moneyDigits } from "@/lib/money";

const row = { rank: 1, position: 1, name: "محمد", photoUrl: null, total: 5000, anonymous: false };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("an activity's supporters", () => {
  it("says nobody has given yet instead of drawing an empty table", () => {
    render(<ActivitySupporters activityId="a1" board={{ rows: [], total: 0, given: 0 }} />);

    expect(screen.getByText(activityPage.supportersEmpty)).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("lists who gave and what the activity was given", () => {
    render(<ActivitySupporters activityId="a1" board={{ rows: [row], total: 1, given: 7000 }} />);

    expect(screen.getByText("محمد")).toBeDefined();
    const heading = screen.getByRole("heading", { name: activityPage.supportersHeading });
    expect(heading.parentElement?.textContent).toContain(moneyDigits(7000));
  });

  it("pages from the activity's own board", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ rows: [] }) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ActivitySupporters activityId="a1" board={{ rows: [row], total: 2, given: 7000 }} />);

    fireEvent.click(screen.getByRole("button", { name: supporters.more }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/activities/a1/supporters?offset=1"),
    );
  });
});
