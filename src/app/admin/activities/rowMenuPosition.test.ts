import { describe, it, expect } from "vitest";
import { MENU_MARGIN, placeRowMenu, type AnchorBox } from "./rowMenuPosition";

const PHONE = { width: 360, height: 740 };
const MENU = { width: 176, height: 152 };

function button(left: number, top: number): AnchorBox {
  return { left, right: left + 32, top, bottom: top + 32 };
}

describe("which way the row menu grows", () => {
  it("hangs a right to left menu off the right edge of its button", () => {
    const at = placeRowMenu(button(200, 300), MENU, PHONE, true);

    expect(at.left).toBe(232 - MENU.width);
  });

  it("hangs a left to right menu off the left edge of its button", () => {
    const at = placeRowMenu(button(100, 300), MENU, PHONE, false);

    expect(at.left).toBe(100);
  });
});

describe("a row menu near the edge of a phone", () => {
  it("stays on screen when the button sits against the near edge", () => {
    const at = placeRowMenu(button(24, 300), MENU, PHONE, true);

    expect(at.left).toBe(MENU_MARGIN);
    expect(at.left + MENU.width).toBeLessThanOrEqual(PHONE.width - MENU_MARGIN);
  });

  it("stays on screen when the button sits against the far edge", () => {
    const at = placeRowMenu(button(304, 300), MENU, PHONE, false);

    expect(at.left + MENU.width).toBe(PHONE.width - MENU_MARGIN);
    expect(at.left).toBeGreaterThanOrEqual(MENU_MARGIN);
  });

  it("pins a menu wider than the screen to the near margin", () => {
    const at = placeRowMenu(button(24, 300), { width: 400, height: 152 }, PHONE, true);

    expect(at.left).toBe(MENU_MARGIN);
  });
});

describe("whether the row menu opens up or down", () => {
  it("opens under the button when there is room", () => {
    const at = placeRowMenu(button(200, 300), MENU, PHONE, true);

    expect(at.top).toBeGreaterThan(332);
    expect(at.top + MENU.height).toBeLessThanOrEqual(PHONE.height);
  });

  it("flips above the button on the last row, where there is none", () => {
    const at = placeRowMenu(button(200, 690), MENU, PHONE, true);

    expect(at.top + MENU.height).toBeLessThan(690);
  });

  it("clamps to the screen when neither side has room", () => {
    const at = placeRowMenu(button(200, 300), { width: 176, height: 700 }, PHONE, true);

    expect(at.top).toBeGreaterThanOrEqual(0);
    expect(at.top).toBe(PHONE.height - MENU_MARGIN - 700);
  });
});
