import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityRegistrationsPanel from "./ActivityRegistrationsPanel";
import type { MemberOption, Registration } from "./activityTypes";

const onRegister = vi.fn();
const onUnregister = vi.fn();
const onReview = vi.fn();

function candidate(over: Partial<MemberOption> = {}): MemberOption {
  return { id: "u1", fullName: "أحمد ولد محمد", phone: "22334455", status: "ACTIVE", ...over };
}

function registration(over: Partial<Registration> = {}): Registration {
  return {
    id: "r1",
    status: "ACTIVE",
    paymentProof: null,
    rejectionReason: null,
    member: { id: "u9", fullName: "سالم ولد علي", phone: "22110099", age: "البدريين" },
    ...over,
  };
}

function show(members: MemberOption[], registrations: Registration[] = []) {
  render(
    <ActivityRegistrationsPanel
      activityId="a1"
      registrations={registrations}
      members={members}
      actionLoading={false}
      onReview={onReview}
      onRegister={onRegister}
      onUnregister={onUnregister}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  onRegister.mockResolvedValue(true);
});

describe("the manual add on the registrants tab", () => {
  it("comes before the registrants themselves", () => {
    show([candidate()], [registration()]);

    const text = document.body.textContent ?? "";
    expect(text.indexOf("تسجيل عضو يدوياً")).toBeLessThan(text.indexOf("مسجَّلون مؤكَّدون"));
  });

  it("finds somebody written with a different alef and registers them on the pick", async () => {
    show([candidate({ fullName: "أحمد ولد محمد" })]);

    await userEvent.type(screen.getByRole("textbox"), "احمد");
    await userEvent.click(screen.getByRole("button", { name: /أحمد ولد محمد/ }));

    expect(onRegister).toHaveBeenCalledWith("a1", "u1");
  });

  it("finds somebody by phone", async () => {
    show([candidate(), candidate({ id: "u2", fullName: "سالم", phone: "22990011" })]);

    await userEvent.type(screen.getByRole("textbox"), "22990011");

    expect(screen.queryByRole("button", { name: /أحمد ولد محمد/ })).toBeNull();
    expect(screen.getByRole("button", { name: /سالم/ })).toBeTruthy();
  });

  it("says so when nothing matches", async () => {
    show([candidate()]);

    await userEvent.type(screen.getByRole("textbox"), "زينب");

    expect(screen.getByText("لا يوجد عضو مطابق")).toBeTruthy();
  });

  it("leaves out somebody already registered", () => {
    show([candidate({ id: "u9" })], [registration()]);

    expect(screen.getByText("كل الأعضاء مسجلون في هذا النشاط")).toBeTruthy();
  });

  it("says a candidate's membership standing in the words the rest of the admin uses", () => {
    show([candidate({ status: "ACTIVE" })]);

    expect(screen.getByText("معتمد")).toBeTruthy();
  });
});
