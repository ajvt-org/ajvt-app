import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DonorNameChoice from "./DonorNameChoice";
import { donorNameChoice as texts } from "@/lib/texts";

function setup(over: Partial<React.ComponentProps<typeof DonorNameChoice>> = {}) {
  const onPick = vi.fn();
  render(<DonorNameChoice wantsName={null} onPick={onPick} {...over} />);
  return { onPick };
}

describe("DonorNameChoice", () => {
  it("starts with neither answer selected", () => {
    setup();

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.getAttribute("aria-checked")).toBe("false");
    }
  });

  it("asks only whether the name may be shown", () => {
    setup();

    expect(screen.getByText(texts.question)).toBeDefined();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("reports both answers back", async () => {
    const { onPick } = setup();

    await userEvent.click(screen.getByRole("radio", { name: texts.yes }));
    expect(onPick).toHaveBeenCalledWith(true);

    await userEvent.click(screen.getByRole("radio", { name: texts.no }));
    expect(onPick).toHaveBeenCalledWith(false);
  });

  it("offers a signed-in member their own name on the yes button", () => {
    setup({ wantsName: true, memberName: "محمد ولد أحمد" });

    expect(screen.getByRole("radio", { name: /محمد ولد أحمد/ })).toBeDefined();
  });

  it("says the association keeps the name when the giver asks not to be shown", () => {
    setup({ wantsName: false });

    expect(screen.getByText(texts.anonymousNote)).toBeDefined();
  });

  it("says what being named means once that is picked", () => {
    setup({ wantsName: true });

    expect(screen.getByText(texts.namedNote)).toBeDefined();
  });

  it("says both answers are equally welcome before either is picked", () => {
    setup();

    expect(screen.getByText(texts.unansweredNote)).toBeDefined();
  });
});
