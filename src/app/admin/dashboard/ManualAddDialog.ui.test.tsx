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

  it("sends the filled form to the admin members endpoint", async () => {
    const fetchMock = mockFetch({ id: "m1" });
    const props = setup();

    await userEvent.click(screen.getByLabelText(/رقم الهاتف غير معروف/));
    await userEvent.type(screen.getByLabelText("الاسم الكامل"), "محمد");
    await userEvent.selectOptions(screen.getByLabelText("العصر"), "شباب");
    await userEvent.selectOptions(screen.getByLabelText("طريقة الدفع"), "نقداً");
    await userEvent.click(screen.getByRole("button", { name: "إنشاء العضو" }));

    await waitFor(() => expect(props.onCreated).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find((c) => c[0] === "/api/admin/members");
    expect(call).toBeDefined();
    expect(JSON.parse(call![1].body)).toMatchObject({
      fullName: "محمد",
      age: "شباب",
      village: HOME_VILLAGE,
      paymentMethod: "نقداً",
      phoneUnknown: true,
    });
  });

  it("shows the temporary password the server sends back", async () => {
    mockFetch({ id: "m1", tempPassword: "AB12CD" });
    setup();

    await userEvent.click(screen.getByLabelText(/رقم الهاتف غير معروف/));
    await userEvent.type(screen.getByLabelText("الاسم الكامل"), "محمد");
    await userEvent.selectOptions(screen.getByLabelText("العصر"), "شباب");
    await userEvent.selectOptions(screen.getByLabelText("طريقة الدفع"), "نقداً");
    await userEvent.click(screen.getByRole("button", { name: "إنشاء العضو" }));

    expect(await screen.findByText("AB12CD")).toBeDefined();
  });

  it("shows the server message when the create fails", async () => {
    mockFetch({ error: "رقم الهاتف مستخدم بالفعل" }, false);
    const props = setup();

    await userEvent.click(screen.getByLabelText(/رقم الهاتف غير معروف/));
    await userEvent.type(screen.getByLabelText("الاسم الكامل"), "محمد");
    await userEvent.selectOptions(screen.getByLabelText("العصر"), "شباب");
    await userEvent.selectOptions(screen.getByLabelText("طريقة الدفع"), "نقداً");
    await userEvent.click(screen.getByRole("button", { name: "إنشاء العضو" }));

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
