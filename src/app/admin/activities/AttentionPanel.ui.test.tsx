import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttentionPanel from "./AttentionPanel";
import type { AttentionRow } from "@/lib/activityAttention";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => get(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

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

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue({ waiting: [row()] });
});

function show(newestFirst = false, onOrderChange = vi.fn()) {
  render(<AttentionPanel newestFirst={newestFirst} onOrderChange={onOrderChange} />);
  return onOrderChange;
}

describe("the panel of what needs the admin", () => {
  it("says what is waiting and which activity it belongs to", async () => {
    show();

    expect(await screen.findByText(/طلب انضمام إلى فريق — محمد — الشناقطة/)).toBeTruthy();
    expect(screen.getByText("كأس رابطة شباب التاكلالت")).toBeTruthy();
  });

  it("links to the tab that clears it", async () => {
    show();

    const link = await screen.findByRole("link");
    expect(link.getAttribute("href")).toBe("/admin/activities/a1?tab=teams");
  });

  it("counts what is waiting in the heading", async () => {
    get.mockResolvedValue({ waiting: [row(), row({ id: "join:2" })] });
    show();

    expect(await screen.findByText(/يحتاج انتباهك \(2\)/)).toBeTruthy();
  });

  it("says plainly when nothing is waiting", async () => {
    get.mockResolvedValue({ waiting: [] });
    show();

    expect(await screen.findByText("لا شيء ينتظرك في الأنشطة")).toBeTruthy();
  });

  it("offers the other order once there is more than one", async () => {
    get.mockResolvedValue({ waiting: [row(), row({ id: "join:2" })] });
    const onOrderChange = show();

    await userEvent.click(await screen.findByRole("button", { name: "الأقدم أولاً" }));

    expect(onOrderChange).toHaveBeenCalledWith(true);
  });

  it("offers no order control for a single item", async () => {
    show();

    await screen.findByText(/يحتاج انتباهك/);
    expect(screen.queryByRole("button", { name: /أولاً/ })).toBeNull();
  });

  it("reads newest first when asked to", async () => {
    get.mockResolvedValue({
      waiting: [
        row({ id: "old", who: "القديم", since: "2026-01-01T00:00:00.000Z" }),
        row({ id: "new", who: "الجديد", since: "2026-08-28T00:00:00.000Z" }),
      ],
    });
    show(true);

    const rows = await screen.findAllByRole("link");
    expect(rows[0].textContent).toContain("الجديد");
  });

  it("folds away when the heading is clicked", async () => {
    show();
    await screen.findByText("كأس رابطة شباب التاكلالت");

    await userEvent.click(screen.getByRole("button", { name: /يحتاج انتباهك/ }));

    expect(screen.queryByText("كأس رابطة شباب التاكلالت")).toBeNull();
  });

  it("shows nothing at all while the answer is still coming", async () => {
    get.mockReturnValue(new Promise(() => {}));
    const { container } = render(<AttentionPanel newestFirst={false} onOrderChange={vi.fn()} />);

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });
});
