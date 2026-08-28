import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import { memberForm, villageField } from "@/lib/texts";
import StepIdentity from "./StepIdentity";
import type { FormValues } from "./constants";

const VILLAGES = [HOME_VILLAGE, "أفجار", OTHER_VILLAGE];
const AGES = ["البدريين", "المجاهدين"];

function renderStep(
  overrides: Partial<FormValues> = {},
  onVillageSelect = vi.fn(),
  onAddAge = vi.fn(),
) {
  const form: FormValues = {
    fullName: "",
    phone: "",
    village: HOME_VILLAGE,
    age: "",
    paymentMethod: "",
    paidAmount: "",
    referenceCode: "",
    ...overrides,
  };
  render(
    <StepIdentity
      form={form}
      setForm={vi.fn()}
      authenticated={false}
      villages={VILLAGES}
      ages={AGES}
      onVillageSelect={onVillageSelect}
      onAddAge={onAddAge}
      error=""
      onNext={vi.fn()}
    />,
  );
  return { onVillageSelect, onAddAge };
}

describe("StepIdentity", () => {
  it("offers every village plus the other option", () => {
    renderStep();

    const select = screen.getByLabelText(/القرية/) as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(["", ...VILLAGES]);
  });

  it("opens on the home village", () => {
    renderStep();

    expect((screen.getByLabelText(/القرية/) as HTMLSelectElement).value).toBe(HOME_VILLAGE);
  });

  it("asks the home village for an age group", () => {
    renderStep();

    expect(screen.queryByLabelText(/العصر/)).not.toBeNull();
  });

  it("does not ask a neighbouring village for an age group", () => {
    renderStep({ village: "أفجار" });

    expect(screen.queryByLabelText(/العصر/)).toBeNull();
  });

  it("does not ask for an age group behind the other option", () => {
    renderStep({ village: OTHER_VILLAGE });

    expect(screen.queryByLabelText(/العصر/)).toBeNull();
  });

  it("explains the other option once it is picked", () => {
    renderStep({ village: OTHER_VILLAGE });

    expect(screen.queryByText(villageField.otherNote)).not.toBeNull();
  });

  it("keeps that explanation out of the way otherwise", () => {
    renderStep();

    expect(screen.queryByText(villageField.otherNote)).toBeNull();
  });

  it("reports the village that was picked", () => {
    const { onVillageSelect } = renderStep();

    fireEvent.change(screen.getByLabelText(/القرية/), { target: { value: "أفجار" } });

    expect(onVillageSelect).toHaveBeenCalledWith("أفجار");
  });

  it("lets a member of the home village suggest an age group", () => {
    renderStep();

    const select = screen.getByLabelText(/العصر/) as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(["", ...AGES, "__add__"]);
  });

  it("reports a suggested age group once it is typed", () => {
    const { onAddAge } = renderStep();

    fireEvent.change(screen.getByLabelText(/العصر/), { target: { value: "__add__" } });
    fireEvent.change(screen.getByLabelText(memberForm.newAgePlaceholder), {
      target: { value: " الفلانيين " },
    });
    fireEvent.click(screen.getByRole("button", { name: memberForm.addAgeAction }));

    expect(onAddAge).toHaveBeenCalledWith("الفلانيين");
  });

  it("says a suggested age group waits on the admin", () => {
    renderStep();

    fireEvent.change(screen.getByLabelText(/العصر/), { target: { value: "__add__" } });

    expect(screen.queryByText(memberForm.addAgeNote)).not.toBeNull();
  });

  it("keeps showing an age group the member already picked but nobody approved", () => {
    renderStep({ age: "الفلانيين" });

    const select = screen.getByLabelText(/العصر/) as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toContain("الفلانيين");
    expect(select.value).toBe("الفلانيين");
  });

  it("offers no age group suggestion to a neighbouring village", () => {
    renderStep({ village: "أفجار" });

    expect(screen.queryByLabelText(/العصر/)).toBeNull();
  });
});
