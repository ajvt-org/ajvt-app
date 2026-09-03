import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Money from "./Money";
import { money, moneyDigits } from "@/lib/money";

describe("an amount on a screen", () => {
  it("reads the same as the amount in a plain string", () => {
    const { container } = render(<Money value={5000} />);
    expect(container.textContent).toBe(money(5000));
  });

  it("drops the currency word when the layout already carries it", () => {
    const { container } = render(<Money value={5000} digitsOnly />);
    expect(container.textContent).toBe(moneyDigits(5000));
  });

  it("keeps the digits in their own left to right run, so a minus stays in front", () => {
    const { container } = render(<Money value={-1500} />);
    expect(container.querySelector('bdi[dir="ltr"]')?.textContent).toBe(moneyDigits(-1500));
  });

  it("isolates the whole amount from the text beside it", () => {
    const { container } = render(<Money value={5000} />);
    expect(container.firstElementChild?.getAttribute("dir")).toBe("rtl");
  });
});
