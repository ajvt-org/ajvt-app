import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemberEditForm from "./MemberEditForm";

const member = {
  id: "m1",
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  paymentMethod: "بنكيلي",
  paidAmount: 100,
  photo: null,
};

function mockFetch(body: unknown = { ageGroups: [{ name: "البدريين" }, { name: "الفائزين" }] }) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
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
    expect(JSON.parse(patchCall![1].body)).toMatchObject({
      age: "الفائزين",
      paymentMethod: "السداد",
      fullName: "محمد ولد أحمد",
    });
  });

  it("refuses to save an empty name", async () => {
    const fetchMock = mockFetch();
    setup();

    await userEvent.clear(screen.getByLabelText("الاسم الكامل"));
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    expect(screen.getByText(/الاسم الكامل مطلوب/)).toBeDefined();
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
