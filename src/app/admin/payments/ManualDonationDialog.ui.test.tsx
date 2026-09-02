import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManualDonationDialog from "./ManualDonationDialog";
import { manualDonation, memberPicker } from "@/lib/texts";
import { members, money } from "@/lib/messages";
import type { MemberOption } from "./paymentTypes";

const ACCOUNT: MemberOption = {
  id: "m1",
  userId: "u1",
  fullName: "أبوبكر لمرابط",
  memberNumber: "AJVT-2026-0061",
  phone: "33655124",
  village: "التاكلالت",
  age: "البدريين",
  photo: null,
};

const SECOND: MemberOption = {
  ...ACCOUNT,
  id: "m2",
  userId: "u2",
  fullName: "الداه الحسن",
  memberNumber: "AJVT-2026-0062",
};

const NO_ACCOUNT_IDS = [ACCOUNT, SECOND].map(
  (m) => ({ ...m, userId: undefined }) as unknown as MemberOption,
);

function mockPost() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({
      donation: {
        id: "d1",
        memberName: "أبوبكر لمرابط",
        donorName: "ابو",
        donorPhone: null,
        donorPhoto: null,
        amount: 2000,
        status: "ACTIVE",
        source: "SELF",
        paymentMethod: "بنكيلي",
        proof: null,
        userId: "u1",
        anonymous: false,
        activityId: null,
        createdAt: "2026-08-20T09:00:00.000Z",
        updatedAt: "2026-08-20T09:00:00.000Z",
      },
    }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function show(members: MemberOption[] = [ACCOUNT]) {
  const onCreated = vi.fn();
  render(
    <ManualDonationDialog
      activities={[]}
      members={members}
      onClose={vi.fn()}
      onCreated={onCreated}
    />,
  );
  return onCreated;
}

async function fillIn() {
  await userEvent.type(screen.getByLabelText(/اسم المتبرع/), "ابو");
  await userEvent.type(screen.getByLabelText(/المبلغ/), "2000");
}

function bodyOf(fetchMock: ReturnType<typeof mockPost>) {
  return JSON.parse(fetchMock.mock.calls[0][1].body);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("recording a support payment by hand", () => {
  it("links it to an account in the same step", async () => {
    const fetchMock = mockPost();
    show();
    await fillIn();

    await userEvent.click(screen.getByText(manualDonation.account, { selector: "span" }));
    await userEvent.type(screen.getByPlaceholderText(memberPicker.search), "ابو");
    await userEvent.click(screen.getByText("أبوبكر لمرابط"));
    await userEvent.click(screen.getByText(manualDonation.submit));

    expect(bodyOf(fetchMock).userId).toBe("u1");
  });

  it("confirms the person who was picked, not the first of the list", async () => {
    const fetchMock = mockPost();
    show([ACCOUNT, SECOND]);
    await fillIn();

    await userEvent.click(screen.getByText(manualDonation.account, { selector: "span" }));
    await userEvent.type(screen.getByPlaceholderText(memberPicker.search), "الداه");
    await userEvent.click(screen.getByText("الداه الحسن"));

    expect(screen.getByText(/AJVT-2026-0062/)).toBeTruthy();
    expect(screen.queryByText(/AJVT-2026-0061/)).toBeNull();

    await userEvent.click(screen.getByText(manualDonation.submit));
    expect(bodyOf(fetchMock).userId).toBe("u2");
  });

  it("confirms nobody rather than the first of the list when no account id arrived", async () => {
    mockPost();
    show(NO_ACCOUNT_IDS);

    await userEvent.click(screen.getByText(manualDonation.account, { selector: "span" }));
    await userEvent.type(screen.getByPlaceholderText(memberPicker.search), "الداه");
    await userEvent.click(screen.getByText("الداه الحسن"));

    expect(screen.queryByText(/AJVT-2026-0061/)).toBeNull();
  });

  it("records it against nobody when no account is picked", async () => {
    const fetchMock = mockPost();
    show();
    await fillIn();

    await userEvent.click(screen.getByText(manualDonation.submit));

    expect(bodyOf(fetchMock).userId).toBeNull();
  });

  it("shows who was picked, with enough to know it is the right person", async () => {
    mockPost();
    show();

    await userEvent.click(screen.getByText(manualDonation.account, { selector: "span" }));
    await userEvent.type(screen.getByPlaceholderText(memberPicker.search), "ابو");
    await userEvent.click(screen.getByText("أبوبكر لمرابط"));

    expect(screen.getByText(/AJVT-2026-0061/)).toBeTruthy();
  });

  it("lets a wrong pick be undone", async () => {
    mockPost();
    show();

    await userEvent.click(screen.getByText(manualDonation.account, { selector: "span" }));
    await userEvent.type(screen.getByPlaceholderText(memberPicker.search), "ابو");
    await userEvent.click(screen.getByText("أبوبكر لمرابط"));
    await userEvent.click(screen.getByText(manualDonation.clearAccount));

    expect(screen.queryByText(/AJVT-2026-0061/)).toBeNull();
  });

  it("shows what the server refused rather than failing silently", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: members.notFound }),
      }),
    );
    show();
    await fillIn();

    await userEvent.click(screen.getByText(manualDonation.submit));

    expect(await screen.findByText(members.notFound)).toBeTruthy();
  });

  it("refuses a name that is only spaces", async () => {
    mockPost();
    show();
    await userEvent.type(screen.getByLabelText(/اسم المتبرع/), "   ");
    await userEvent.type(screen.getByLabelText(/المبلغ/), "2000");

    await userEvent.click(screen.getByText(manualDonation.submit));

    expect(screen.getByText(money.nameRequired)).toBeTruthy();
  });

  it("hands back the proof named the way the server named it", async () => {
    mockPost();
    const onCreated = show();
    await fillIn();

    await userEvent.click(screen.getByText(manualDonation.account, { selector: "span" }));
    await userEvent.type(screen.getByPlaceholderText(memberPicker.search), "ابو");
    await userEvent.click(screen.getByText("أبوبكر لمرابط"));
    await userEvent.click(screen.getByText(manualDonation.submit));

    expect(onCreated.mock.calls[0][0].memberName).toBe("أبوبكر لمرابط");
  });
});
