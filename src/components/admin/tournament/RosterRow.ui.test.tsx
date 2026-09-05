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
  onToggleCaptain: vi.fn(),
  onApprove: vi.fn(),
  onRemove: vi.fn(),
};

function answer(yes: boolean) {
  vi.stubGlobal("confirm", vi.fn().mockReturnValue(yes));
}

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

  it("names both actions without printing a word on either", () => {
    show(entry(LONG_NAME));

    const toggle = screen.getByRole("button", { name: `اجعل ${LONG_NAME} قائد الفريق` });
    expect(toggle.textContent).toBe("");
    expect(toggle.getAttribute("title")).toBe(`اجعل ${LONG_NAME} قائد الفريق`);
    expect(screen.queryByText("إزالة")).toBeNull();
    expect(screen.getByLabelText(`إزالة ${LONG_NAME}`)).toBeDefined();
  });

  it("tells the two captain states apart by hue and by weight, not by a shade", () => {
    const off = show(entry(LONG_NAME)).querySelector("button") as HTMLElement;
    const offBackground = off.style.background;
    const offColor = off.style.color;
    const on = show(entry(LONG_NAME), { captain: true }).querySelector("button") as HTMLElement;

    expect(offBackground).toContain("mint");
    expect(on.style.background).toContain("copper");
    expect(on.style.color).not.toBe(offColor);
  });

  it("gives the two actions different shapes, not just different tints", () => {
    show(entry(LONG_NAME));

    const toggle = screen.getByLabelText(`اجعل ${LONG_NAME} قائد الفريق`);
    const destructive = screen.getByLabelText(`إزالة ${LONG_NAME}`);
    expect(toggle.className).not.toContain("btn-icon");
    expect(destructive.className).toContain("btn-icon");
    expect(destructive.textContent).toBe("");
  });

  it("asks before it removes a player, and cancelling removes nobody", () => {
    answer(false);
    show(entry(LONG_NAME));
    fireEvent.click(screen.getByLabelText(`إزالة ${LONG_NAME}`));
    expect(confirm).toHaveBeenCalledWith(`إزالة ${LONG_NAME} من الفريق؟`);
    expect(handlers.onRemove).not.toHaveBeenCalled();

    answer(true);
    fireEvent.click(screen.getByLabelText(`إزالة ${LONG_NAME}`));
    expect(handlers.onRemove).toHaveBeenCalled();
  });

  it("asks a different question before rejecting someone still waiting", () => {
    answer(false);
    show(entry(LONG_NAME, "PENDING"));
    fireEvent.click(screen.getByLabelText(`رفض ${LONG_NAME}`));
    expect(confirm).toHaveBeenCalledWith(`رفض طلب ${LONG_NAME} للانضمام؟`);
    expect(handlers.onRemove).not.toHaveBeenCalled();
  });

  it("says what the captain button will do next", () => {
    show(entry(LONG_NAME), { captain: true });

    const toggle = screen.getByRole("button", { name: `إلغاء قيادة ${LONG_NAME} للفريق` });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.getAttribute("title")).toBe(`إلغاء قيادة ${LONG_NAME} للفريق`);
  });

  it("marks a captain with a colour on the row and no word", () => {
    const captainRow = show(entry(LONG_NAME), { captain: true }).firstElementChild as HTMLElement;
    expect(captainRow.style.border).toContain("copper");
    expect(screen.queryByText("القائد")).toBeNull();

    const plainRow = show(entry(LONG_NAME)).firstElementChild as HTMLElement;
    expect(plainRow.style.border).toContain("transparent");
  });

  it("keeps a pending captain reading as pending", () => {
    const row = show(entry(LONG_NAME, "PENDING"), { captain: true })
      .firstElementChild as HTMLElement;

    expect(row.style.background).toBe("rgb(254, 243, 199)");
    expect(row.style.border).toContain("copper");
    expect(screen.getByText("بانتظار الموافقة")).toBeDefined();
  });

  it("keeps the destructive action beside the others and tells it apart by tone", () => {
    const container = show(entry(LONG_NAME, "PENDING"));

    const actions = [...container.querySelectorAll("button")];
    expect(actions.map((b) => b.textContent)).toEqual(["قبول", "", ""]);
    for (const action of actions) expect(action.className).not.toContain("ms-auto");
    expect(actions[2].style.background).not.toBe(actions[0].style.background);
    expect(actions[2].style.background).not.toBe(actions[1].style.background);
  });

  it("keeps the actions on a comfortable target", () => {
    const container = show(entry(LONG_NAME, "PENDING"));

    for (const action of container.querySelectorAll("button")) {
      expect(action.className).toContain("btn-sm");
    }
  });

  it("keeps accept, reject and captain working", () => {
    answer(true);
    show(entry(LONG_NAME, "PENDING"));

    fireEvent.click(screen.getByLabelText(`قبول ${LONG_NAME}`));
    expect(handlers.onApprove).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(`رفض ${LONG_NAME}`));
    expect(handlers.onRemove).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(`اجعل ${LONG_NAME} قائد الفريق`));
    expect(handlers.onToggleCaptain).toHaveBeenCalled();
  });

  it("opens the player's card and offers no rename", () => {
    show(entry(LONG_NAME));

    const link = screen.getByLabelText(`فتح بطاقة ${LONG_NAME}`);
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/admin/members/p1");
    expect(screen.queryByLabelText(`تعديل اسم ${LONG_NAME}`)).toBeNull();
  });

  it("makes the name itself the link and says nothing beside it", () => {
    show(entry(LONG_NAME));

    const link = screen.getByLabelText(`فتح بطاقة ${LONG_NAME}`);
    expect(link.textContent).toBe(LONG_NAME);
    expect(screen.queryByText("البطاقة")).toBeNull();
  });

  it("leaves the badges outside the link, they are not part of the target", () => {
    show(entry(LONG_NAME, "PENDING"), { captain: true, suspended: true });

    const link = screen.getByLabelText(`فتح بطاقة ${LONG_NAME}`);
    for (const badge of ["بانتظار الموافقة", "موقوف"]) {
      expect(link.contains(screen.getByText(badge))).toBe(false);
    }
  });

  it("says a player is waiting or suspended in words", () => {
    show(entry(LONG_NAME, "PENDING"), { suspended: true });

    expect(screen.getByText("بانتظار الموافقة")).toBeDefined();
    expect(screen.getByText("موقوف")).toBeDefined();
  });
});
