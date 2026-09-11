import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemberIdentityCard from "./MemberIdentityCard";
import { accountPhone, memberAccount, memberPage, memberPhoto } from "@/lib/texts";

const patch = vi.fn().mockResolvedValue({ tempPassword: "AB12CD", tempPasswordHours: 48 });
const post = vi.fn().mockResolvedValue({ tempPassword: "EF34GH", hours: 24 });

vi.mock("@/lib/api", () => ({
  api: {
    patch: (...args: unknown[]) => patch(...args),
    post: (...args: unknown[]) => post(...args),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function show(over: Partial<Parameters<typeof MemberIdentityCard>[0]> = {}) {
  const onChanged = vi.fn();
  const onToggleEdit = vi.fn();
  render(
    <MemberIdentityCard
      memberId="m1"
      userId="u1"
      fullName="محمد ولد أحمد"
      photo={null}
      phone="36000001"
      village="التاكلالت"
      age="البدريين"
      memberNumber="AJVT-2026-0001"
      photoLocked={false}
      editing={false}
      onToggleEdit={onToggleEdit}
      onChanged={onChanged}
      {...over}
    />,
  );
  return { onChanged, onToggleEdit };
}

describe("the card that draws a member", () => {
  it("prints the phone once, on the line of facts rather than beside a control", () => {
    show();

    expect(screen.getAllByText(/36000001/)).toHaveLength(1);
  });

  it("names nothing the controls already name", () => {
    show({ photo: "p.webp" });

    expect(screen.queryByText(accountPhone.label)).toBeNull();
    expect(screen.queryByText(memberPage.edit)).toBeNull();
    expect(screen.queryByText(accountPhone.edit)).toBeNull();
  });

  it("keeps the words on the verbs a reader hears", () => {
    show();

    expect(screen.getByRole("button", { name: memberPage.edit })).toBeTruthy();
    expect(screen.getByRole("button", { name: accountPhone.edit })).toBeTruthy();
    expect(screen.getByRole("button", { name: memberPhoto.lock })).toBeTruthy();
  });

  it("draws the two edits on two different icons", () => {
    show();

    const record = screen.getByRole("button", { name: memberPage.edit });
    const account = screen.getByRole("button", { name: accountPhone.edit });
    expect(record.querySelector("path")!.getAttribute("d")).not.toBe(
      account.querySelector("path")!.getAttribute("d"),
    );
  });

  it("turns the pencil into a way out while the record is being edited", () => {
    show({ editing: true });

    expect(screen.getByRole("button", { name: memberPage.cancel })).toBeTruthy();
    expect(screen.queryByRole("button", { name: memberPage.edit })).toBeNull();
  });

  it("keeps the word on the password reset, since a lock alone says nothing about it", () => {
    show();

    expect(screen.getByText(memberAccount.reset)).toBeTruthy();
  });

  it("opens the correction under the card and closes it again", async () => {
    show();

    await userEvent.click(screen.getByRole("button", { name: accountPhone.edit }));
    expect(screen.getByLabelText(accountPhone.label)).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: accountPhone.cancel }));
    expect(screen.queryByLabelText(accountPhone.label)).toBeNull();
  });

  it("hands back the temporary password under the card", async () => {
    show();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(memberAccount.reset) }));

    expect(post).toHaveBeenCalledWith("/api/admin/reset-password", { userId: "u1" });
    expect(await screen.findByText("EF34GH")).toBeTruthy();
  });

  it("offers no photo removal when there is no photo to remove", () => {
    show();

    expect(screen.queryByRole("button", { name: memberPhoto.remove })).toBeNull();
  });

  it("keeps the photo removal out of the group holding the routine verbs", () => {
    show({ photo: "p.webp" });

    const lock = screen.getByRole("button", { name: memberPhoto.lock });
    const remove = screen.getByRole("button", { name: memberPhoto.remove });
    expect(lock.parentElement!.contains(remove)).toBe(false);
    expect(remove.parentElement!.className).toContain("shrink-0");
  });

  it("asks before locking a photo away, since locking deletes the one that is there", async () => {
    show({ photo: "p.webp" });

    await userEvent.click(screen.getByRole("button", { name: memberPhoto.lock }));

    expect(screen.getByText(memberPhoto.confirmLock)).toBeTruthy();
    expect(patch).not.toHaveBeenCalled();
  });

  it("locks without asking when there is no photo to lose", async () => {
    show();

    await userEvent.click(screen.getByRole("button", { name: memberPhoto.lock }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { photoLocked: true });
  });

  it("says the photo is locked and offers to let it go again", () => {
    show({ photoLocked: true });

    expect(screen.getByText(memberPhoto.lockedBadge)).toBeTruthy();
    expect(screen.getByRole("button", { name: memberPhoto.unlock })).toBeTruthy();
  });
});

describe("a member an admin added by hand", () => {
  it("says there is no account and offers to make one", () => {
    show({ userId: null, phone: null });

    expect(screen.getByText(memberAccount.none)).toBeTruthy();
    expect(screen.getByLabelText(memberAccount.phoneLabel)).toBeTruthy();
  });

  it("offers neither a correction nor a reset until the account exists", () => {
    show({ userId: null, phone: null });

    expect(screen.queryByRole("button", { name: accountPhone.edit })).toBeNull();
    expect(screen.queryByText(memberAccount.reset)).toBeNull();
  });

  it("still lets the record and the photo be worked on", () => {
    show({ userId: null, phone: null, photo: "p.webp" });

    expect(screen.getByRole("button", { name: memberPage.edit })).toBeTruthy();
    expect(screen.getByRole("button", { name: memberPhoto.remove })).toBeTruthy();
  });

  it("hands back the password the new account starts on", async () => {
    const { onChanged } = show({ userId: null, phone: null });

    await userEvent.type(screen.getByLabelText(memberAccount.phoneLabel), "36000001");
    await userEvent.click(screen.getByRole("button", { name: memberAccount.create }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { accountPhone: "36000001" });
    expect(await screen.findByText("AB12CD")).toBeTruthy();
    expect(onChanged).toHaveBeenCalled();
  });
});

describe("an account that has no number yet", () => {
  it("offers to add one, in words, since there is no number to point at", () => {
    show({ phone: null });

    expect(screen.getByRole("button", { name: accountPhone.add })).toBeTruthy();
    expect(screen.getByText(accountPhone.add)).toBeTruthy();
  });

  it("sends the first number to the route that also gives the person a way in", async () => {
    show({ phone: null });

    await userEvent.click(screen.getByRole("button", { name: accountPhone.add }));
    await userEvent.type(screen.getByLabelText(accountPhone.label), "36000002");
    await userEvent.click(screen.getByRole("button", { name: accountPhone.save }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { accountPhone: "36000002" });
  });

  it("hands back the temporary password the number was issued with", async () => {
    const { onChanged } = show({ phone: null });

    await userEvent.click(screen.getByRole("button", { name: accountPhone.add }));
    await userEvent.type(screen.getByLabelText(accountPhone.label), "36000002");
    await userEvent.click(screen.getByRole("button", { name: accountPhone.save }));

    expect(await screen.findByText("AB12CD")).toBeTruthy();
    expect(onChanged).toHaveBeenCalled();
  });

  it("says to add a number rather than to correct one", async () => {
    show({ phone: null });

    await userEvent.click(screen.getByRole("button", { name: accountPhone.add }));

    expect(screen.getByText(accountPhone.noneHint)).toBeTruthy();
    expect(screen.queryByText(accountPhone.hint)).toBeNull();
  });
});

describe("an account whose number is only wrong", () => {
  it("still goes to the route that corrects a number and issues no password", async () => {
    show();

    await userEvent.click(screen.getByRole("button", { name: accountPhone.edit }));
    await userEvent.clear(screen.getByLabelText(accountPhone.label));
    await userEvent.type(screen.getByLabelText(accountPhone.label), "36000003");
    await userEvent.click(screen.getByRole("button", { name: accountPhone.save }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1/account", { phone: "36000003" });
    expect(screen.queryByText("AB12CD")).toBeNull();
  });
});
