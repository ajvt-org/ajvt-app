import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsForm from "./SettingsForm";
import { emptySettingsForm } from "./types";

const setup = (onChange = vi.fn(), onSubmit = vi.fn()) => {
  render(
    <SettingsForm
      values={emptySettingsForm}
      error=""
      saving={false}
      onChange={onChange}
      onSubmit={onSubmit}
    />,
  );
  return { onChange, onSubmit };
};

describe("SettingsForm", () => {
  it("asks only what a new question needs", () => {
    setup();

    expect(screen.getByLabelText("عدد الإجابات الافتراضي")).toBeDefined();
    expect(screen.getByLabelText("عدد الإجابات الصحيحة الافتراضي")).toBeDefined();
    expect(screen.getByLabelText("النقاط الافتراضية للسؤال")).toBeDefined();
  });

  it("leaves the running of a competition to the competition", () => {
    setup();

    expect(screen.queryByLabelText(/عدد الأسئلة المرسلة يومياً/)).toBeNull();
    expect(screen.queryByLabelText(/مدة الإجابة بالثواني/)).toBeNull();
    expect(screen.queryByLabelText(/أقل نسبة للنقاط/)).toBeNull();
  });

  it("says where those settings live instead", () => {
    setup();

    expect(screen.getByText(/يضبط داخل المسابقة نفسها/)).toBeDefined();
  });

  it("keeps the points within the range a difficulty is read from", () => {
    setup();

    const points = screen.getByLabelText("النقاط الافتراضية للسؤال") as HTMLInputElement;
    expect(points.min).toBe("1");
    expect(points.max).toBe("20");
  });

  it("reports what was typed", async () => {
    const { onChange } = setup();

    await userEvent.type(screen.getByLabelText("النقاط الافتراضية للسؤال"), "2");

    expect(onChange).toHaveBeenCalledWith("defaultPoints", "102");
  });

  it("shows what the server refused", () => {
    render(
      <SettingsForm
        values={emptySettingsForm}
        error="عدد الإجابات الصحيحة أكبر من عدد الإجابات"
        saving={false}
        onChange={() => {}}
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByText(/عدد الإجابات الصحيحة أكبر/)).toBeDefined();
  });
});
