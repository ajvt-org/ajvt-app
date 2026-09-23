import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import ElectionPanel from "./ElectionPanel";
import type { ElectionRow } from "./electionTypes";

const del = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    del: (...args: unknown[]) => del(...args),
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const HOUR = 3600_000;
const TITLE = "انتخاب اللجنة";

function row(over: Partial<ElectionRow>): ElectionRow {
  return {
    id: "e1",
    title: TITLE,
    hidden: false,
    startsAt: new Date(Date.now() - 3 * HOUR).toISOString(),
    durationMinutes: 60,
    allowBlank: false,
    shuffleCandidates: false,
    showResults: true,
    candidates: [],
    _count: { ballots: 4 },
    ...over,
  };
}

function show(election: ElectionRow) {
  const onDeleted = vi.fn();
  render(
    <ElectionPanel
      election={election}
      electorate={10}
      onSaved={vi.fn()}
      onChanged={vi.fn()}
      onDeleted={onDeleted}
    />,
  );
  return onDeleted;
}

describe("deleting an election", () => {
  beforeEach(() => {
    cleanup();
    del.mockReset().mockResolvedValue({ deleted: true });
  });

  it("offers the delete on a published election that members voted in", async () => {
    const onDeleted = show(row({}));

    fireEvent.click(screen.getByRole("button", { name: "حذف الانتخاب" }));
    fireEvent.click(screen.getByRole("button", { name: "تأكيد" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(del).toHaveBeenCalledWith("/api/admin/elections/e1", { confirmTitle: "" });
  });

  it("asks for the title while voting is still open", async () => {
    const onDeleted = show(row({ startsAt: new Date(Date.now() - HOUR / 2).toISOString() }));

    fireEvent.click(screen.getByRole("button", { name: "حذف الانتخاب" }));
    fireEvent.click(screen.getByRole("button", { name: "متابعة" }));
    const confirm = screen.getAllByRole("button", { name: "حذف الانتخاب" }).at(-1)!;
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("عنوان الانتخاب للتأكيد"), {
      target: { value: TITLE },
    });
    fireEvent.click(confirm);

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(del).toHaveBeenCalledWith("/api/admin/elections/e1", { confirmTitle: TITLE });
  });
});
