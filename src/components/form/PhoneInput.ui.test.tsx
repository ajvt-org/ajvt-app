import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PhoneInput from "./PhoneInput";

function renderInput(onChange = vi.fn()) {
  render(<PhoneInput value="" onChange={onChange} />);
  return { input: screen.getByPlaceholderText("2XXXXXXX"), onChange };
}

describe("PhoneInput", () => {
  it("keeps only the digits of what was typed", () => {
    const { input, onChange } = renderInput();

    fireEvent.change(input, { target: { value: "22-33 44/55" } });

    expect(onChange).toHaveBeenCalledWith("22334455");
  });

  it("stops at eight digits, which is the length of a number here", () => {
    const { input, onChange } = renderInput();

    fireEvent.change(input, { target: { value: "2233445566" } });

    expect(onChange).toHaveBeenCalledWith("22334455");
  });

  it("reads left to right, since a phone number is not Arabic text", () => {
    const { input } = renderInput();

    expect(input.getAttribute("dir")).toBe("ltr");
  });
});
