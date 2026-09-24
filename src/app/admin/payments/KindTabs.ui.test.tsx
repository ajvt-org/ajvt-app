import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { paymentsPage } from "@/lib/texts";
import KindTabs from "./KindTabs";

describe("the kind tabs on the payments screen", () => {
  it("offers all, membership and donation", () => {
    render(<KindTabs active="ALL" onPick={() => {}} />);

    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      paymentsPage.kindAll,
      paymentsPage.kindMembership,
      paymentsPage.kindDonation,
    ]);
  });

  it("offers no activities tab, since nothing ever puts a payment behind one", () => {
    render(<KindTabs active="ALL" onPick={() => {}} />);

    expect(screen.queryByRole("button", { name: paymentsPage.kindActivity })).toBeNull();
  });

  it("hands back the kind picked", async () => {
    const onPick = vi.fn();
    render(<KindTabs active="ALL" onPick={onPick} />);

    await userEvent.click(screen.getByRole("button", { name: paymentsPage.kindDonation }));

    expect(onPick).toHaveBeenCalledWith("DONATION");
  });
});
