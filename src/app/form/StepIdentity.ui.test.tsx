import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import { villageField } from "@/lib/texts";
import StepIdentity from "./StepIdentity";
import type { FormValues } from "./constants";

const VILLAGES = [HOME_VILLAGE, "أفجار", OTHER_VILLAGE];
const AGES = ["البدريين", "المجاهدين"];

function renderStep(overrides: Partial<FormValues> = {}, onVillageSelect = vi.fn()) {
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
      error=""
      onNext={vi.fn()}
    />,
  );
  return { onVillageSelect };
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

  it("offers no way to invent an age group", () => {
    renderStep();

    const select = screen.getByLabelText(/العصر/) as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(["", ...AGES]);
  });
});
