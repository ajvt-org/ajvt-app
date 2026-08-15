import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Toggle from "./Toggle";

describe("Toggle", () => {
  it("announces itself as a switch and reports its state", () => {
    render(<Toggle label="الإشعارات" checked onChange={() => {}} />);

    expect(screen.getByRole("switch", { name: "الإشعارات" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("asks for the opposite of what it currently is", () => {
    const onChange = vi.fn();
    render(<Toggle label="الإشعارات" checked onChange={onChange} />);

    fireEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("turns on from off", () => {
    const onChange = vi.fn();
    render(<Toggle label="الإشعارات" checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not fire while disabled, so a blocked permission cannot be flipped", () => {
    const onChange = vi.fn();
    render(<Toggle label="الإشعارات" checked={false} disabled onChange={onChange} />);

    fireEvent.click(screen.getByRole("switch"));

    expect(onChange).not.toHaveBeenCalled();
  });
});
