import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DonorNameChoice from "./DonorNameChoice";

function setup(over: Partial<React.ComponentProps<typeof DonorNameChoice>> = {}) {
  const onPick = vi.fn();
  const onDonorName = vi.fn();
  render(
    <DonorNameChoice
      wantsName={null}
      onPick={onPick}
      donorName=""
      onDonorName={onDonorName}
      {...over}
    />,
  );
  return { onPick, onDonorName };
}

describe("DonorNameChoice", () => {
  it("starts with neither answer selected", () => {
    setup();

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.getAttribute("aria-checked")).toBe("false");
    }
  });

  it("asks nothing about a name until the donor says they want one", () => {
    setup();

    expect(screen.queryByLabelText("اسمك")).toBeNull();
  });

  it("opens the name field once the donor asks to be named", () => {
    setup({ wantsName: true });

    expect(screen.getByLabelText("اسمك")).toBeDefined();
  });

  it("reports both answers back", async () => {
    const { onPick } = setup();

    await userEvent.click(screen.getByRole("radio", { name: /باسمي/ }));
    expect(onPick).toHaveBeenCalledWith(true);

    await userEvent.click(screen.getByRole("radio", { name: /مجهولاً/ }));
    expect(onPick).toHaveBeenCalledWith(false);
  });

  it("offers a signed-in member their own name rather than a field", () => {
    setup({ wantsName: true, memberName: "محمد ولد أحمد" });

    expect(screen.getByRole("radio", { name: /محمد ولد أحمد/ })).toBeDefined();
    expect(screen.queryByLabelText("اسمك")).toBeNull();
  });

  it("says what each answer means once it is picked", () => {
    const { unmount } = render(
      <DonorNameChoice wantsName={false} onPick={() => {}} donorName="" onDonorName={() => {}} />,
    );
    expect(screen.getByText(/فاعل خير/)).toBeDefined();
    unmount();

    render(
      <DonorNameChoice wantsName={true} onPick={() => {}} donorName="" onDonorName={() => {}} />,
    );
    expect(screen.getByText(/سنذكر اسمك تقديراً لدعمك/)).toBeDefined();
  });
});
