import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminBackLink from "./AdminBackLink";

const back = vi.fn();
const previousIs = vi.fn();
const noteReplacement = vi.fn();

vi.mock("@/lib/historyTrail", () => ({
  appTrail: {
    previousIs: (url: string) => previousIs(url),
    noteReplacement: (url: string) => noteReplacement(url),
  },
}));

function press() {
  const click = new MouseEvent("click", { bubbles: true, cancelable: true });
  screen.getByRole("link").dispatchEvent(click);
  return click;
}

beforeEach(() => {
  vi.spyOn(window.history, "back").mockImplementation(back);
  back.mockClear();
  noteReplacement.mockClear();
  previousIs.mockReturnValue(false);
});

describe("AdminBackLink", () => {
  it("names where it returns to, which a bare arrow does not", () => {
    render(<AdminBackLink href="/admin/activities">الأنشطة</AdminBackLink>);

    expect(screen.getByRole("link").textContent).toContain("الأنشطة");
    expect(screen.getByRole("link").getAttribute("href")).toBe("/admin/activities");
  });

  it("unwinds when the entry behind the admin is that screen", () => {
    previousIs.mockReturnValue(true);
    render(<AdminBackLink href="/admin/activities">الأنشطة</AdminBackLink>);
    const click = press();

    expect(back).toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(true);
  });

  it("replaces rather than pushing when the admin arrived from somewhere else", () => {
    render(<AdminBackLink href="/admin/activities">الأنشطة</AdminBackLink>);
    press();

    expect(back).not.toHaveBeenCalled();
    expect(noteReplacement).toHaveBeenCalledWith("/admin/activities");
  });

  it("points its arrow the way this app reads", () => {
    const { container } = render(<AdminBackLink href="/admin">لوحة التحكم</AdminBackLink>);

    expect(container.querySelector("svg")).not.toBeNull();
  });
});
