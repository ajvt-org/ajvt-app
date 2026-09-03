import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import RosterRow from "./RosterRow";
import type { TeamMemberEntry } from "./types";

const LONG_NAME = "الحسن احمدو يحي البناني";

function entry(name: string, status: "ACTIVE" | "PENDING" = "ACTIVE"): TeamMemberEntry {
  return {
    status,
    member: { id: "p1", fullName: name, phone: "36000001", age: "البدريين", photo: null },
  };
}

const handlers = {
  onRename: vi.fn(),
  onToggleCaptain: vi.fn(),
  onApprove: vi.fn(),
  onRemove: vi.fn(),
};

function show(member: TeamMemberEntry, { captain = false, suspended = false } = {}): HTMLElement {
  cleanup();
  const { container } = render(
    <RosterRow entry={member} suspended={suspended} captain={captain} busy={false} {...handlers} />,
  );
  return container;
}

describe("RosterRow", () => {
  beforeEach(() => {
    for (const fn of Object.values(handlers)) fn.mockReset();
  });

  it("gives the name a row of its own that wraps instead of clipping", () => {
    show(entry(LONG_NAME));

    const name = screen.getByText(LONG_NAME).closest("span") as HTMLElement;
    expect(name.className).not.toContain("truncate");
    expect(name.style.overflowWrap).toBe("anywhere");
  });

  it("labels both actions on screen and keeps their aria labels", () => {
    show(entry(LONG_NAME));

    expect(screen.getByText("تعيين قائداً")).toBeDefined();
    expect(screen.getByText("إزالة")).toBeDefined();
    expect(screen.getByLabelText(`اجعل ${LONG_NAME} قائد الفريق`)).toBeDefined();
    expect(screen.getByLabelText(`إزالة ${LONG_NAME}`)).toBeDefined();
  });

  it("says what the captain button will do next", () => {
    show(entry(LONG_NAME), { captain: true });

    expect(screen.getByText("إلغاء القيادة")).toBeDefined();
    expect(
      screen.getByLabelText(`إلغاء قيادة ${LONG_NAME} للفريق`).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByText("القائد")).toBeDefined();
  });

  it("separates the destructive action from the other two", () => {
    const container = show(entry(LONG_NAME, "PENDING"));

    const actions = [...container.querySelectorAll("button")].slice(1);
    expect(actions.map((b) => b.textContent)).toEqual(["قبول", "تعيين قائداً", "رفض"]);
    expect(actions[2].className).toContain("ms-auto");
  });

  it("keeps accept, reject, captain and rename working", () => {
    show(entry(LONG_NAME, "PENDING"));

    fireEvent.click(screen.getByLabelText(`قبول ${LONG_NAME}`));
    expect(handlers.onApprove).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(`رفض ${LONG_NAME}`));
    expect(handlers.onRemove).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(`اجعل ${LONG_NAME} قائد الفريق`));
    expect(handlers.onToggleCaptain).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(`تعديل اسم ${LONG_NAME}`));
    expect(handlers.onRename).toHaveBeenCalled();
  });

  it("says a player is waiting or suspended in words", () => {
    show(entry(LONG_NAME, "PENDING"), { suspended: true });

    expect(screen.getByText("بانتظار الموافقة")).toBeDefined();
    expect(screen.getByText("موقوف")).toBeDefined();
  });
});
