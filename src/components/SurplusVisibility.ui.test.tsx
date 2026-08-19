import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SurplusVisibility from "./SurplusVisibility";

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
      supportAmount={400}
      anonymous={false}
      onChanged={() => {}}
      {...props}
    />,
  );
}

describe("changing how a membership surplus appears", () => {
  it("says nothing to a member who paid only the fee", () => {
    const { container } = show({ supportAmount: 0 });

    expect(container.firstChild).toBeNull();
  });

  it("shows the amount that is on the board", () => {
    show();

    expect(screen.getByText(/400 أوقية/)).toBeDefined();
  });

  it("takes the name off when the member asks to be anonymous", async () => {
    const onChanged = vi.fn();
    show({ onChanged });

    await userEvent.click(screen.getByRole("radio", { name: /أفضّل أن أبقى مجهولاً/ }));

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

    await userEvent.click(screen.getByRole("radio", { name: /أفضّل أن أبقى مجهولاً/ }));

    expect(await screen.findByText("تعذّر الحفظ")).toBeDefined();
  });
});
