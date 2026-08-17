import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemberDecision from "./MemberDecision";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function mockFetch() {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setup(status = "PENDING") {
  const onDecided = vi.fn();
  render(
    <MemberDecision memberId="m1" fullName="محمد ولد أحمد" status={status} onDecided={onDecided} />,
  );
  return { onDecided };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("MemberDecision", () => {
  it("offers both decisions on a pending request", () => {
    setup("PENDING");

    expect(screen.getByRole("button", { name: /قبول/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /رفض/ })).toBeDefined();
  });

  it("does not offer to accept someone already accepted", () => {
    setup("ACTIVE");

    expect(screen.queryByRole("button", { name: /^قبول/ })).toBeNull();
    expect(screen.getByRole("button", { name: /رفض/ })).toBeDefined();
  });

  it("offers to accept someone who was refused", () => {
    setup("REJECTED");

    expect(screen.getByRole("button", { name: /قبول/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /^رفض/ })).toBeNull();
  });

  it("accepts without asking for a reason", async () => {
    const fetchMock = mockFetch();
    const { onDecided } = setup("PENDING");

    await userEvent.click(screen.getByRole("button", { name: /قبول/ }));

    await waitFor(() => expect(onDecided).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ id: "m1", action: "ACTIVE" });
  });

  it("asks for a reason before refusing, and sends the one picked", async () => {
    const fetchMock = mockFetch();
    const { onDecided } = setup("PENDING");

    await userEvent.click(screen.getByRole("button", { name: /رفض/ }));
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.selectOptions(screen.getByLabelText("سبب الرفض"), "طلب مكرر");
    await userEvent.click(screen.getByRole("button", { name: "تأكيد الرفض" }));

    await waitFor(() => expect(onDecided).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      id: "m1",
      action: "REJECTED",
      rejectionReason: "طلب مكرر",
    });
  });

  it("asks for the name before deleting anything", async () => {
    const fetchMock = mockFetch();
    setup("REJECTED");

    await userEvent.click(screen.getByRole("button", { name: /حذف/ }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /متابعة/ })).toBeDefined();
  });

  it("sends the typed name with the deletion, which the API demands", async () => {
    const fetchMock = mockFetch();
    setup("REJECTED");

    await userEvent.click(screen.getByRole("button", { name: /حذف/ }));
    await userEvent.click(screen.getByRole("button", { name: /متابعة/ }));
    await userEvent.type(screen.getByLabelText("اسم العضو للتأكيد"), "محمد ولد أحمد");
    await userEvent.click(screen.getByRole("button", { name: /حذف نهائي/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/dashboard"));
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      confirmName: "محمد ولد أحمد",
    });
  });

  it("keeps the delete disabled until the name matches", async () => {
    const fetchMock = mockFetch();
    setup("REJECTED");

    await userEvent.click(screen.getByRole("button", { name: /حذف/ }));
    await userEvent.click(screen.getByRole("button", { name: /متابعة/ }));
    await userEvent.type(screen.getByLabelText("اسم العضو للتأكيد"), "محمد");
    await userEvent.click(screen.getByRole("button", { name: /حذف نهائي/ }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
