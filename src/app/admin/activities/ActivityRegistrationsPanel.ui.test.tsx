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
    team: null,
    member: {
      id: "u9",
      fullName: "سالم ولد علي",
      phone: "22110099",
      age: "البدريين",
      photo: null,
    },
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

    await userEvent.type(screen.getByPlaceholderText("ابحث بالاسم أو الهاتف..."), "احمد");
    await userEvent.click(screen.getByRole("button", { name: /أحمد ولد محمد/ }));

    expect(onRegister).toHaveBeenCalledWith("a1", "u1");
  });

  it("finds somebody by phone", async () => {
    show([candidate(), candidate({ id: "u2", fullName: "سالم", phone: "22990011" })]);

    await userEvent.type(screen.getByPlaceholderText("ابحث بالاسم أو الهاتف..."), "22990011");

    expect(screen.queryByRole("button", { name: /أحمد ولد محمد/ })).toBeNull();
    expect(screen.getByRole("button", { name: /سالم/ })).toBeTruthy();
  });

  it("says so when nothing matches", async () => {
    show([candidate()]);

    await userEvent.type(screen.getByPlaceholderText("ابحث بالاسم أو الهاتف..."), "زينب");

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

describe("the list of registrants", () => {
  it("says which team a registrant is in", () => {
    show([], [registration({ team: { id: "t1", name: "الشناقطة" } })]);

    expect(screen.getByText("الشناقطة")).toBeTruthy();
  });

  it("says when a registrant has no team", () => {
    show([], [registration()]);

    expect(screen.getByText("بلا فريق")).toBeTruthy();
  });

  it("folds a section away and back", async () => {
    show([], [registration()]);

    const heading = screen.getByRole("button", { name: /مسجَّلون مؤكَّدون/ });
    expect(screen.getByText("سالم ولد علي")).toBeTruthy();

    await userEvent.click(heading);
    expect(screen.queryByText("سالم ولد علي")).toBeNull();

    await userEvent.click(heading);
    expect(screen.getByText("سالم ولد علي")).toBeTruthy();
  });

  it("searches the registrants with the same folding, by name and by team", async () => {
    show(
      [],
      [
        registration({ member: { ...registration().member, fullName: "أحمد ولد محمد" } }),
        registration({
          id: "r2",
          team: { id: "t1", name: "الشناقطة" },
          member: { id: "u8", fullName: "سالم", phone: "22110088", age: "البدريين", photo: null },
        }),
      ],
    );

    const box = screen.getByPlaceholderText(/ابحث في المسجلين/);

    await userEvent.type(box, "احمد");
    expect(screen.queryByText("سالم")).toBeNull();

    await userEvent.clear(box);
    await userEvent.type(box, "الشناقطة");
    expect(screen.queryByText("أحمد ولد محمد")).toBeNull();
    expect(screen.getByText("سالم")).toBeTruthy();
  });

  it("counts what each section holds", () => {
    show([], [registration(), registration({ id: "r2", status: "PENDING" })]);

    expect(screen.getByRole("button", { name: /مسجَّلون مؤكَّدون \(1\)/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /طلبات قيد المراجعة \(1\)/ })).toBeTruthy();
  });
});
