import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LinkMemberPanel from "./LinkMemberPanel";
import { memberPicker } from "@/lib/texts";
import type { MemberOption } from "./paymentTypes";

function member(over: Partial<MemberOption> = {}): MemberOption {
  return {
    id: "m1",
    userId: "u1",
    fullName: "أبوبكر لمرابط",
    memberNumber: "AJVT-2026-0061",
    phone: "33655124",
    village: "التاكلالت",
    age: "البدريين",
    photo: null,
    ...over,
  };
}

function show(members: MemberOption[], onPick = vi.fn()) {
  render(<LinkMemberPanel members={members} busy={false} onPick={onPick} />);
  return onPick;
}

describe("picking the member a gift belongs to", () => {
  it("finds a name typed without its hamza", async () => {
    show([member()]);

    await userEvent.type(screen.getByPlaceholderText(memberPicker.search), "ابو");

    expect(screen.getByText("أبوبكر لمرابط")).toBeTruthy();
  });

  it("hands back the account, not the membership row", async () => {
    const onPick = show([member()]);

    await userEvent.click(screen.getByRole("button"));

    expect(onPick).toHaveBeenCalledWith("u1");
  });

  it("shows enough to tell two people of the same name apart", () => {
    show([
      member({ id: "m1", userId: "u1", fullName: "الداه الحسن", memberNumber: "AJVT-2026-0061" }),
      member({
        id: "m2",
        userId: "u2",
        fullName: "الداه الحسن",
        memberNumber: "AJVT-2026-0062",
        phone: "43191466",
      }),
    ]);

    expect(screen.getByText(/AJVT-2026-0061/)).toBeTruthy();
    expect(screen.getByText(/AJVT-2026-0062/)).toBeTruthy();
  });

  it("searches the membership number as well as the name", async () => {
    show([
      member({ id: "m1", userId: "u1", fullName: "الداه الحسن", memberNumber: "AJVT-2026-0061" }),
      member({
        id: "m2",
        userId: "u2",
        fullName: "الداه الحسن",
        memberNumber: "AJVT-2026-0062",
        phone: "43191466",
      }),
    ]);

    await userEvent.type(screen.getByPlaceholderText(memberPicker.search), "0062");

    expect(screen.queryByText(/AJVT-2026-0061/)).toBeNull();
    expect(screen.getByText(/AJVT-2026-0062/)).toBeTruthy();
  });

  it("searches the phone number too", async () => {
    show([member(), member({ id: "m2", userId: "u2", fullName: "أحمد", phone: "22001122" })]);

    await userEvent.type(screen.getByPlaceholderText(memberPicker.search), "22001122");

    expect(screen.getByText("أحمد")).toBeTruthy();
    expect(screen.queryByText("أبوبكر لمرابط")).toBeNull();
  });

  it("says how many it left out rather than silently cutting the list", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      member({ id: `m${i}`, userId: `u${i}`, fullName: `عضو ${i}`, memberNumber: `AJVT-${i}` }),
    );

    show(many);

    expect(screen.getByText(memberPicker.more(4))).toBeTruthy();
  });

  it("says nothing about a list it showed whole", () => {
    show([member()]);

    expect(screen.queryByText(/غيرهم/)).toBeNull();
  });

  it("says so when nothing matches", async () => {
    show([member()]);

    await userEvent.type(screen.getByPlaceholderText(memberPicker.search), "زائر");

    expect(screen.getByText(memberPicker.noMatch)).toBeTruthy();
  });
});
