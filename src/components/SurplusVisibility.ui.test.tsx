import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SurplusVisibility from "./SurplusVisibility";
import { donorNameChoice, paidAmount as paidTexts } from "@/lib/texts";

const patch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { patch: (...args: unknown[]) => patch(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

beforeEach(() => {
  patch.mockReset();
  patch.mockResolvedValue({});
});

function show(props: Partial<React.ComponentProps<typeof SurplusVisibility>> = {}) {
  return render(
    <SurplusVisibility
      memberId="m1"
      memberName="محمد ولد أحمد"
      paidAmount={100}
      supportAmount={400}
      anonymous={false}
      onChanged={() => {}}
      {...props}
    />,
  );
}

describe("what a member sees about the payment they made", () => {
  it("says nothing to a member who paid only the fee", () => {
    const { container } = show({ supportAmount: 0 });

    expect(container.firstChild).toBeNull();
  });

  it("shows the amount that is on the board", () => {
    show();

    expect(screen.getByText(/400 أوقية/)).toBeDefined();
  });

  it("breaks the one payment into the fee, the part above it and the total", () => {
    const { container } = show();

    expect(screen.getByText(paidTexts.fee)).toBeDefined();
    expect(screen.getByText(paidTexts.support)).toBeDefined();
    expect(screen.getByText(paidTexts.total)).toBeDefined();
    expect(container.textContent).toContain("500");
  });

  it("takes the name off when the member asks to be anonymous", async () => {
    const onChanged = vi.fn();
    show({ onChanged });

    await userEvent.click(screen.getByRole("radio", { name: donorNameChoice.no }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/members/m1", {
        surplusAnonymous: true,
      }),
    );
    expect(onChanged).toHaveBeenCalledWith(true);
    expect(screen.getByText("تم الحفظ")).toBeDefined();
  });

  it("puts the name back when the member changes their mind again", async () => {
    show({ anonymous: true });

    await userEvent.click(screen.getByRole("radio", { name: /محمد ولد أحمد/ }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/members/m1", { surplusAnonymous: false }),
    );
  });

  it("does not write again when the member picks the answer already stored", async () => {
    show({ anonymous: false });

    await userEvent.click(screen.getByRole("radio", { name: /محمد ولد أحمد/ }));

    expect(patch).not.toHaveBeenCalled();
  });

  it("keeps the failure on the screen", async () => {
    patch.mockRejectedValue(new Error("تعذّر الحفظ"));
    show();

    await userEvent.click(screen.getByRole("radio", { name: donorNameChoice.no }));

    expect(await screen.findByText("تعذّر الحفظ")).toBeDefined();
  });
});
