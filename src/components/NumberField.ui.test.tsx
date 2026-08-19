import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NumberField from "./NumberField";

function Held({ start, onChange }: { start: number; onChange?: (value: number) => void }) {
  const [value, setValue] = useState(start);
  return (
    <NumberField
      value={value}
      ariaLabel="عدد"
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("NumberField", () => {
  it("shows the number it was given", () => {
    render(<NumberField value={30} ariaLabel="عدد" onChange={() => {}} />);

    expect((screen.getByLabelText("عدد") as HTMLInputElement).value).toBe("30");
  });

  it("stays empty when it is cleared rather than falling back to zero", async () => {
    const onChange = vi.fn();
    render(<Held start={30} onChange={onChange} />);

    await userEvent.clear(screen.getByLabelText("عدد"));

    expect((screen.getByLabelText("عدد") as HTMLInputElement).value).toBe("");
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it("takes the digits typed after clearing without keeping a leading zero", async () => {
    const onChange = vi.fn();
    render(<Held start={30} onChange={onChange} />);

    await userEvent.clear(screen.getByLabelText("عدد"));
    await userEvent.type(screen.getByLabelText("عدد"), "10");

    expect((screen.getByLabelText("عدد") as HTMLInputElement).value).toBe("10");
    expect(onChange).toHaveBeenLastCalledWith(10);
  });

  it("follows the value when something else changes it", () => {
    const { rerender } = render(<NumberField value={5} ariaLabel="عدد" onChange={() => {}} />);

    rerender(<NumberField value={12} ariaLabel="عدد" onChange={() => {}} />);

    expect((screen.getByLabelText("عدد") as HTMLInputElement).value).toBe("12");
  });

  it("reports what was typed", async () => {
    const onChange = vi.fn();
    render(<NumberField value={0} ariaLabel="عدد" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("عدد"), "7");

    expect(onChange).toHaveBeenLastCalledWith(7);
  });

  it("carries the bounds it was given", () => {
    render(<NumberField value={5} min={1} max={20} ariaLabel="عدد" onChange={() => {}} />);

    const input = screen.getByLabelText("عدد") as HTMLInputElement;
    expect(input.min).toBe("1");
    expect(input.max).toBe("20");
  });

  it("can be switched off", () => {
    render(<NumberField value={5} disabled ariaLabel="عدد" onChange={() => {}} />);

    expect((screen.getByLabelText("عدد") as HTMLInputElement).disabled).toBe(true);
  });
});
