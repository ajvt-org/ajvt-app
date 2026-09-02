import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttentionPanel from "./AttentionPanel";
import type { AttentionRow } from "@/lib/activityAttention";

function row(over: Partial<AttentionRow> = {}): AttentionRow {
  return {
    id: "join:1",
    kind: "join",
    activityId: "a1",
    activityTitle: "كأس رابطة شباب التاكلالت",
    who: "محمد — الشناقطة",
    since: "2026-08-20T00:00:00.000Z",
    ...over,
  };
}

function show(rows: AttentionRow[], newestFirst = false, onOrderChange = vi.fn()) {
  render(<AttentionPanel rows={rows} newestFirst={newestFirst} onOrderChange={onOrderChange} />);
  return onOrderChange;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the panel of what needs the admin", () => {
  it("says what is waiting and which activity it belongs to", () => {
    show([row()]);

    expect(screen.getByText(/طلب انضمام إلى فريق — محمد — الشناقطة/)).toBeTruthy();
    expect(screen.getByText("كأس رابطة شباب التاكلالت")).toBeTruthy();
  });

  it("links to the tab that clears it", () => {
    show([row()]);

    expect(screen.getByRole("link").getAttribute("href")).toBe("/admin/activities/a1?tab=teams");
  });

  it("counts what is waiting in the heading", () => {
    show([row(), row({ id: "join:2" })]);

    expect(screen.getByText(/يحتاج انتباهك \(2\)/)).toBeTruthy();
  });

  it("says plainly when nothing is waiting", () => {
    show([]);

    expect(screen.getByText("لا شيء ينتظرك في الأنشطة")).toBeTruthy();
  });

  it("offers the other order once there is more than one", async () => {
    const onOrderChange = show([row(), row({ id: "join:2" })]);

    await userEvent.click(screen.getByRole("button", { name: "الأقدم أولاً" }));

    expect(onOrderChange).toHaveBeenCalledWith(true);
  });

  it("offers no order control for a single item", () => {
    show([row()]);

    expect(screen.queryByRole("button", { name: /أولاً/ })).toBeNull();
  });

  it("reads newest first when asked to", () => {
    show(
      [
        row({ id: "old", who: "القديم", since: "2026-01-01T00:00:00.000Z" }),
        row({ id: "new", who: "الجديد", since: "2026-08-28T00:00:00.000Z" }),
      ],
      true,
    );

    expect(screen.getAllByRole("link")[0].textContent).toContain("الجديد");
  });

  it("folds away when the heading is clicked", async () => {
    show([row()]);

    await userEvent.click(screen.getByRole("button", { name: /يحتاج انتباهك/ }));

    expect(screen.queryByText("كأس رابطة شباب التاكلالت")).toBeNull();
  });
});
