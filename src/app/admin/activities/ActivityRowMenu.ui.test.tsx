import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityRowMenu, { type RowMenuItem } from "./ActivityRowMenu";

const pick = vi.fn();

const items: RowMenuItem[] = [
  { key: "duplicate", label: "نسخ النشاط", icon: "copy", onPick: pick },
];

function show(label = "خيارات النشاط") {
  render(<ActivityRowMenu label={label} items={items} />);
}

async function open(label = "خيارات النشاط") {
  await userEvent.click(screen.getByRole("button", { name: label }));
}

function isOpen(label = "خيارات النشاط"): boolean {
  return screen.getByRole("button", { name: label }).getAttribute("aria-expanded") === "true";
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("how the row menu behaves under a finger", () => {
  it("closes on a touch outside itself", async () => {
    show();
    await open();

    fireEvent.pointerDown(document.body);

    expect(isOpen()).toBe(false);
  });

  it("stays open when the touch lands inside it", async () => {
    show();
    await open();

    fireEvent.pointerDown(screen.getByRole("button", { name: "نسخ النشاط" }));

    expect(isOpen()).toBe(true);
  });

  it("rides the scroll with its button rather than closing", async () => {
    show();
    await open();

    fireEvent.scroll(window);

    expect(isOpen()).toBe(true);
  });
});

describe("closing the row menu from the keyboard", () => {
  it("closes on Escape", async () => {
    show();
    await open();

    await userEvent.keyboard("{Escape}");

    expect(isOpen()).toBe(false);
  });

  it("puts focus back on the button that opened it", async () => {
    show();
    await open();

    await userEvent.keyboard("{Escape}");

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "خيارات النشاط" }));
  });

  it("leaves other keys alone", async () => {
    show();
    await open();

    fireEvent.keyDown(document, { key: "ArrowDown" });

    expect(isOpen()).toBe(true);
  });
});

describe("two row menus at once", () => {
  it("closes the one already open when another is asked for", async () => {
    render(
      <>
        <ActivityRowMenu label="خيارات الأول" items={items} />
        <ActivityRowMenu label="خيارات الثاني" items={items} />
      </>,
    );

    await open("خيارات الأول");
    expect(isOpen("خيارات الأول")).toBe(true);

    await open("خيارات الثاني");

    expect(isOpen("خيارات الثاني")).toBe(true);
    expect(isOpen("خيارات الأول")).toBe(false);
  });
});

describe("picking from the row menu", () => {
  it("runs the item and shuts the menu", async () => {
    show();
    await open();

    await userEvent.click(screen.getByRole("button", { name: "نسخ النشاط" }));

    expect(pick).toHaveBeenCalledOnce();
    expect(isOpen()).toBe(false);
  });

  it("shuts on a second press of its own button", async () => {
    show();
    await open();

    await open();

    expect(isOpen()).toBe(false);
  });
});
