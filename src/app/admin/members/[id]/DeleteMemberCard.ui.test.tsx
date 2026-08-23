import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeleteMemberCard from "./DeleteMemberCard";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function mockFetch() {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setup() {
  render(<DeleteMemberCard memberId="m1" fullName="محمد ولد أحمد" />);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("DeleteMemberCard", () => {
  it("asks for the name before deleting anything", async () => {
    const fetchMock = mockFetch();
    setup();

    await userEvent.click(screen.getByRole("button", { name: /حذف الطلب نهائياً/ }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /متابعة/ })).toBeDefined();
  });

  it("sends the typed name with the deletion, which the API demands", async () => {
    const fetchMock = mockFetch();
    setup();

    await userEvent.click(screen.getByRole("button", { name: /حذف الطلب نهائياً/ }));
    await userEvent.click(screen.getByRole("button", { name: /متابعة/ }));
    await userEvent.type(screen.getByLabelText("اسم العضو للتأكيد"), "محمد ولد أحمد");
    await userEvent.click(screen.getByRole("button", { name: /حذف نهائي$/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/dashboard"));
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      confirmName: "محمد ولد أحمد",
    });
  });

  it("keeps the delete disabled until the name matches", async () => {
    const fetchMock = mockFetch();
    setup();

    await userEvent.click(screen.getByRole("button", { name: /حذف الطلب نهائياً/ }));
    await userEvent.click(screen.getByRole("button", { name: /متابعة/ }));
    await userEvent.type(screen.getByLabelText("اسم العضو للتأكيد"), "محمد");
    await userEvent.click(screen.getByRole("button", { name: /حذف نهائي$/ }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
