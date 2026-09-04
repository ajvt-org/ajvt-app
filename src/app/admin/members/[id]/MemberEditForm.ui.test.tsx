import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import MemberEditForm from "./MemberEditForm";
import { answering } from "@tests/ui/paymentMethods";
import { memberEdit, paymentAccountPicker } from "@/lib/texts";

const member = {
  id: "m1",
  fullName: "محمد ولد أحمد",
  age: "البدريين" as string | null,
  village: HOME_VILLAGE,
  paymentMethod: "بنكيلي",
  accountId: null as string | null,
  account: null as { id: string; code: string; label: string | null } | null,
  paidAmount: 100,
  supportAmount: 0,
  photo: null,
};

function mockFetch(body: unknown = { ageGroups: [{ name: "البدريين" }, { name: "الفائزين" }] }) {
  const fetchMock = vi.fn(
    answering(async () => ({ ok: true, status: 200, json: async () => body })),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setup(over: Partial<typeof member> = {}) {
  const onSaved = vi.fn();
  const onCancel = vi.fn();
  render(<MemberEditForm member={{ ...member, ...over }} onSaved={onSaved} onCancel={onCancel} />);
  return { onSaved, onCancel };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MemberEditForm", () => {
  it("offers the age groups the association has", async () => {
    mockFetch();
    setup();

    await waitFor(() => expect(screen.getByRole("option", { name: "الفائزين" })).toBeDefined());
    expect(screen.getByRole("option", { name: "البدريين" })).toBeDefined();
  });

  it("keeps a group that no longer exists rather than moving the member off it", async () => {
    mockFetch({ ageGroups: [{ name: "الفائزين" }] });
    setup({ age: "عصر محذوف" });

    await waitFor(() => expect(screen.getByRole("option", { name: "الفائزين" })).toBeDefined());
    expect(screen.getByRole("option", { name: "عصر محذوف" })).toBeDefined();
    expect((screen.getByLabelText("العصر") as HTMLSelectElement).value).toBe("عصر محذوف");
  });

  it("sends the corrected age group and payment method", async () => {
    const fetchMock = mockFetch();
    const { onSaved } = setup();
    await waitFor(() => expect(screen.getByRole("option", { name: "الفائزين" })).toBeDefined());

    await userEvent.selectOptions(screen.getByLabelText("العصر"), "الفائزين");
    await userEvent.selectOptions(screen.getByLabelText("طريقة الدفع"), "السداد");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const patchCall = fetchMock.mock.calls.find((c) => c[1]?.method === "PATCH");
    expect(patchCall?.[0]).toBe("/api/admin/members/m1");
    const putCall = fetchMock.mock.calls.find((c) => c[1]?.method === "PUT");
    expect(putCall?.[0]).toBe("/api/admin/members/m1/payment");
    expect(JSON.parse(String(putCall![1]?.body))).toMatchObject({ paymentMethod: "السداد" });
    expect(JSON.parse(String(patchCall![1]?.body))).toMatchObject({
      age: "الفائزين",
      fullName: "محمد ولد أحمد",
    });
    expect(JSON.parse(String(patchCall![1]?.body))).not.toHaveProperty("paidAmount");
  });

  it("refuses to save an empty name", async () => {
    const fetchMock = mockFetch();
    setup();

    await userEvent.clear(screen.getByLabelText("الاسم الكامل"));
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    expect(screen.getByText(/الاسم الكامل مطلوب/)).toBeDefined();
    expect(fetchMock.mock.calls.some((c) => c[1]?.method === "PATCH")).toBe(false);
  });

  it("asks a member of the home village for an age group", async () => {
    mockFetch();
    setup();

    expect(screen.queryByLabelText("العصر")).not.toBeNull();
  });

  it("drops the age group question for a neighbouring village", async () => {
    mockFetch();
    setup({ village: "أفجار", age: null });

    expect(screen.queryByLabelText("العصر")).toBeNull();
  });

  it("keeps a village that is no longer managed rather than moving the member off it", async () => {
    mockFetch({ villages: [{ name: "أفجار" }] });
    setup({ village: "بوتلميت", age: null });

    await waitFor(() =>
      expect((screen.getByLabelText("القرية") as HTMLSelectElement).value).toBe("بوتلميت"),
    );
  });

  it("sends the corrected village and clears the age group with it", async () => {
    const fetchMock = mockFetch({ villages: [{ name: "أفجار" }] });
    const { onSaved } = setup();
    await waitFor(() => expect(screen.getByRole("option", { name: "أفجار" })).toBeDefined());

    await userEvent.selectOptions(screen.getByLabelText("القرية"), "أفجار");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const patchCall = fetchMock.mock.calls.find((c) => c[1]?.method === "PATCH");
    expect(JSON.parse(String(patchCall![1]?.body))).toMatchObject({ village: "أفجار", age: null });
  });

  it("lets an admin correct a member who picked the other option", async () => {
    const fetchMock = mockFetch({ villages: [{ name: "أفجار" }] });
    const { onSaved } = setup({ village: OTHER_VILLAGE, age: null });
    await waitFor(() => expect(screen.getByRole("option", { name: "أفجار" })).toBeDefined());

    await userEvent.selectOptions(screen.getByLabelText("القرية"), "أفجار");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const patchCall = fetchMock.mock.calls.find((c) => c[1]?.method === "PATCH");
    expect(JSON.parse(String(patchCall![1]?.body))).toMatchObject({ village: "أفجار" });
  });

  it("refuses to save a member of the home village with no age group", async () => {
    const fetchMock = mockFetch();
    setup({ age: "" });

    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    expect(screen.getByText(/يرجى اختيار العصر/)).toBeDefined();
    expect(fetchMock.mock.calls.some((c) => c[1]?.method === "PATCH")).toBe(false);
  });

  it("refuses an amount below the membership fee", async () => {
    const fetchMock = mockFetch();
    setup();

    const amount = screen.getByLabelText(/المبلغ المسدد/);
    await userEvent.clear(amount);
    await userEvent.type(amount, "10");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    expect(fetchMock.mock.calls.some((c) => c[1]?.method === "PATCH")).toBe(false);
  });
});

describe("the number a membership payment landed in", () => {
  it("is offered for the method the record holds", async () => {
    mockFetch();
    setup();

    const picker = await screen.findByLabelText(paymentAccountPicker.label);
    expect(within(picker).getByText("111111")).toBeDefined();
  });

  it("is not offered for a method that receives into none", async () => {
    mockFetch();
    setup({ paymentMethod: "نقداً" });

    await screen.findByLabelText(memberEdit.paymentMethodLabel);
    expect(screen.queryByLabelText(paymentAccountPicker.label)).toBeNull();
  });

  it("keeps a closed number the record already points at", async () => {
    mockFetch();
    setup({ accountId: "old", account: { id: "old", code: "999999", label: null } });

    const picker = (await screen.findByLabelText(paymentAccountPicker.label)) as HTMLSelectElement;
    expect(picker.value).toBe("old");
    expect(within(picker).getByText("999999")).toBeDefined();
  });
});
