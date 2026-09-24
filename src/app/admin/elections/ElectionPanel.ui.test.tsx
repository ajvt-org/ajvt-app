import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import ElectionPanel from "./ElectionPanel";
import type { ElectionRow } from "./electionTypes";

const del = vi.fn();
const put = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    del: (...args: unknown[]) => del(...args),
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: (...args: unknown[]) => put(...args),
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

function show(election: ElectionRow, owner = false) {
  const onDeleted = vi.fn();
  render(
    <ElectionPanel
      election={election}
      electorate={10}
      owner={owner}
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

describe("an election whose vote has started", () => {
  beforeEach(() => cleanup());

  it("lets the locked controls say it, with no banner over them", () => {
    show(row({ startsAt: new Date(Date.now() - HOUR / 2).toISOString() }));

    expect(screen.queryByText(/انطلق التصويت/)).toBeNull();
    expect(screen.getByRole("switch", { name: "السماح بالورقة البيضاء" }).tagName).toBe("SPAN");
    expect(
      (screen.getByRole("button", { name: "إضافة مترشح" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

describe("moving the close of an election", () => {
  beforeEach(() => {
    cleanup();
    put.mockReset().mockResolvedValue({});
  });

  const running = () => row({ startsAt: new Date(Date.now() - HOUR / 2).toISOString() });

  it("is not offered to an admin who is not the owner", () => {
    show(running());

    expect(screen.queryByRole("button", { name: "تمديد التصويت" })).toBeNull();
    expect(screen.queryByRole("button", { name: "إعادة فتح التصويت" })).toBeNull();
  });

  it("is not offered before the vote opens, where the duration still moves", () => {
    show(row({ startsAt: new Date(Date.now() + HOUR).toISOString() }), true);

    expect(screen.queryByRole("button", { name: "تمديد التصويت" })).toBeNull();
  });

  it("lets the owner run an open vote longer", async () => {
    show(running(), true);

    fireEvent.click(screen.getByRole("button", { name: "تمديد التصويت" }));
    const field = screen.getByLabelText("موعد الانتهاء الجديد") as HTMLInputElement;
    expect(field.value).not.toBe("");
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الموعد" }));

    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(put.mock.calls[0][0]).toBe("/api/admin/elections/e1/close");
    expect(await screen.findByRole("button", { name: "تمديد التصويت" })).toBeTruthy();
  });

  it("warns before reopening a vote whose result members can read", async () => {
    show(row({ showResults: true }), true);

    fireEvent.click(screen.getByRole("button", { name: "إعادة فتح التصويت" }));
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الموعد" }));
    expect(put).not.toHaveBeenCalled();
    expect(screen.getByText("تختفي النتيجة عن الأعضاء حتى ينتهي التصويت من جديد")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "تأكيد" }));
    await waitFor(() => expect(put).toHaveBeenCalled());
  });

  it("reopens a vote with a held result without asking", async () => {
    show(row({ showResults: false }), true);

    fireEvent.click(screen.getByRole("button", { name: "إعادة فتح التصويت" }));
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الموعد" }));

    await waitFor(() => expect(put).toHaveBeenCalled());
  });
});
