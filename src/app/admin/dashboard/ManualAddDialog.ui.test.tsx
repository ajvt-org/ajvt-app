import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManualAddDialog from "./ManualAddDialog";
import { HOME_VILLAGE } from "@/lib/villages";

const ageGroups = [
  { id: "1", name: "أشبال" },
  { id: "2", name: "شباب" },
];

function setup(overrides: Partial<React.ComponentProps<typeof ManualAddDialog>> = {}) {
  const props = {
    ageGroups,
    onCreated: vi.fn(),
    onManageAgeGroups: vi.fn(),
    onManageVillages: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<ManualAddDialog {...props} />);
  return props;
}

function mockFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ManualAddDialog", () => {
  it("asks for the account number, and only that one", () => {
    setup();

    expect(screen.getByLabelText(/رقم هاتف الحساب/)).toBeDefined();
    expect(screen.queryByLabelText("رقم هاتف العضو")).toBeNull();
  });

  it("drops the phone field when the phone is unknown", async () => {
    setup();

    await userEvent.click(screen.getByLabelText(/رقم الهاتف غير معروف/));

    expect(screen.queryByLabelText(/رقم هاتف الحساب/)).toBeNull();
  });

  it("offers every age group it is given", () => {
    setup();

    expect(screen.getByRole("option", { name: "أشبال" })).toBeDefined();
    expect(screen.getByRole("option", { name: "شباب" })).toBeDefined();
  });

  async function fillPerson() {
    await userEvent.click(screen.getByLabelText(/رقم الهاتف غير معروف/));
    await userEvent.type(screen.getByLabelText("الاسم الكامل"), "محمد");
    await userEvent.selectOptions(screen.getByLabelText("العصر"), "شباب");
    await userEvent.click(screen.getByRole("button", { name: "حفظ الشخص" }));
  }

  it("saves the person on its own, with nothing about money", async () => {
    const fetchMock = mockFetch({ person: { id: "u1" } });
    const props = setup();

    await fillPerson();

    await waitFor(() => expect(props.onCreated).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find((c) => c[0] === "/api/admin/people");
    expect(call).toBeDefined();
    const body = JSON.parse(call![1].body);
    expect(body).toMatchObject({
      fullName: "محمد",
      age: "شباب",
      village: HOME_VILLAGE,
      phoneUnknown: true,
    });
    expect(body.paymentMethod).toBeUndefined();
  });

  it("moves on to the payment once the person is saved", async () => {
    mockFetch({ person: { id: "u1" } });
    setup();

    await fillPerson();

    expect(await screen.findByLabelText("طريقة الدفع")).toBeDefined();
    expect(screen.queryByLabelText("الاسم الكامل")).toBeNull();
  });

  it("posts the payment against the person it just saved", async () => {
    const fetchMock = mockFetch({ person: { id: "u1" } });
    setup();

    await fillPerson();
    await userEvent.selectOptions(await screen.findByLabelText("طريقة الدفع"), "نقداً");
    await userEvent.click(screen.getByRole("button", { name: "تسجيل الاشتراك" }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.find((c) => c[0] === "/api/admin/people/u1/membership"),
      ).toBeDefined(),
    );
  });

  it("lets the admin stop after the person, with no payment at all", async () => {
    const fetchMock = mockFetch({ person: { id: "u1" } });
    setup();

    await fillPerson();
    await userEvent.click(await screen.findByRole("button", { name: "بدون اشتراك الآن" }));

    expect(fetchMock.mock.calls.find((c) => String(c[0]).includes("/membership"))).toBeUndefined();
  });

  it("starts at the payment when the admin picked an existing person", async () => {
    mockFetch({});
    setup({ payFor: { id: "u9", fullName: "سيدي ولد أحمد" } });

    expect(screen.getByLabelText("طريقة الدفع")).toBeDefined();
    expect(screen.queryByLabelText("الاسم الكامل")).toBeNull();
  });

  it("shows the temporary password the server sends back", async () => {
    mockFetch({ person: { id: "u1" }, tempPassword: "AB12CD" });
    setup();

    await fillPerson();
    await userEvent.click(await screen.findByRole("button", { name: "بدون اشتراك الآن" }));

    expect(await screen.findByText("AB12CD")).toBeDefined();
  });

  it("shows the server message when saving the person fails", async () => {
    mockFetch({ error: "رقم الهاتف مستخدم بالفعل" }, false);
    const props = setup();

    await fillPerson();

    expect(await screen.findByText(/رقم الهاتف مستخدم بالفعل/)).toBeDefined();
    expect(props.onCreated).not.toHaveBeenCalled();
  });

  it("hands age group management back to the dashboard", async () => {
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: /إدارة الأعصار/ }));

    expect(props.onManageAgeGroups).toHaveBeenCalled();
  });

  it("closes on the close control, which screen readers can name", async () => {
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: "إغلاق" }));

    expect(props.onClose).toHaveBeenCalled();
  });
});
