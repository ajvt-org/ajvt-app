import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityRegistrationsPanel from "./ActivityRegistrationsPanel";
import type { MemberOption, Registration } from "./activityTypes";

const onRegister = vi.fn();
const onUnregister = vi.fn();
const onReview = vi.fn();

function candidate(over: Partial<MemberOption> = {}): MemberOption {
  return {
    id: "u1",
    fullName: "أحمد ولد محمد",
    phone: "22334455",
    photo: null,
    age: "البدريين",
    village: "التاكلالت",
    status: "ACTIVE",
    ...over,
  };
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

function show(
  members: MemberOption[],
  registrations: Registration[] = [],
  teams: { id: string; name: string }[] = [],
) {
  render(
    <ActivityRegistrationsPanel
      activityId="a1"
      registrations={registrations}
      members={members}
      teams={teams}
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

  it("lists nobody until the admin types", () => {
    show([candidate()]);

    expect(screen.queryByText("أحمد ولد محمد")).toBeNull();
    expect(screen.getByText("اكتب اسماً أو رقم هاتف للبحث عن عضو")).toBeTruthy();
  });

  it("tells two people of the same name apart by phone, village and عصر", async () => {
    show([
      candidate({ id: "u1", phone: "22334455", village: "التاكلالت", age: "البدريين" }),
      candidate({ id: "u2", phone: "22990011", village: "أجوير", age: "الأشبال" }),
    ]);

    await userEvent.type(screen.getByPlaceholderText("ابحث بالاسم أو الهاتف..."), "احمد");

    expect(screen.getByText("22334455")).toBeTruthy();
    expect(screen.getByText("22990011")).toBeTruthy();
    expect(screen.getByText("التاكلالت · البدريين")).toBeTruthy();
    expect(screen.getByText("أجوير · الأشبال")).toBeTruthy();
  });

  it("stays quiet about a membership that is approved", async () => {
    show([candidate({ status: "ACTIVE" })]);

    await userEvent.type(screen.getByPlaceholderText("ابحث بالاسم أو الهاتف..."), "احمد");

    expect(screen.queryByText("معتمد")).toBeNull();
  });

  it("warns when a membership is not approved", async () => {
    show([candidate({ status: "PENDING" })]);

    await userEvent.type(screen.getByPlaceholderText("ابحث بالاسم أو الهاتف..."), "احمد");

    expect(screen.getByText("قيد الانتظار")).toBeTruthy();
  });

  it("finds a candidate by their village", async () => {
    show([
      candidate({ id: "u1", fullName: "محمد", village: "التاكلالت" }),
      candidate({ id: "u2", fullName: "سالم", village: "أجوير" }),
    ]);

    await userEvent.type(screen.getByPlaceholderText("ابحث بالاسم أو الهاتف..."), "اجوير");

    expect(screen.getByText("سالم")).toBeTruthy();
    expect(screen.queryByText("محمد")).toBeNull();
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

const SHANAQITA = { id: "t1", name: "الشناقطة" };
const SAHEL = { id: "t2", name: "أهل الساحل" };

function player(id: string, fullName: string, team: Registration["team"]): Registration {
  return registration({
    id,
    team,
    member: { id: `u-${id}`, fullName, phone: null, age: "البدريين", photo: null },
  });
}

describe("looking at one team's registrants", () => {
  it("offers no chips at all when the activity has no teams", () => {
    show([], [registration()]);

    expect(screen.queryByRole("group", { name: "تصفية حسب الفريق" })).toBeNull();
  });

  it("offers every team, one nobody joined included, and having none", () => {
    show([], [player("r1", "محمد", SHANAQITA)], [SHANAQITA, SAHEL]);

    const chips = screen.getByRole("group", { name: "تصفية حسب الفريق" });

    for (const label of ["كل الفرق", "الشناقطة", "أهل الساحل", "بلا فريق"]) {
      expect(within(chips).getByRole("button", { name: label })).toBeDefined();
    }
  });

  it("keeps only the players of the team picked", async () => {
    show([], [player("r1", "محمد", SHANAQITA), player("r2", "سالم", SAHEL)], [SHANAQITA, SAHEL]);

    await userEvent.click(screen.getByRole("button", { name: "الشناقطة" }));

    expect(screen.getByText("محمد")).toBeDefined();
    expect(screen.queryByText("سالم")).toBeNull();
  });

  it("finds the people who still have no team", async () => {
    show([], [player("r1", "محمد", SHANAQITA), player("r2", "سالم", null)], [SHANAQITA]);

    await userEvent.click(screen.getByRole("button", { name: "بلا فريق" }));

    expect(screen.getByText("سالم")).toBeDefined();
    expect(screen.queryByText("محمد")).toBeNull();
  });

  it("says nobody matched when the team picked is empty", async () => {
    show([], [player("r1", "محمد", SHANAQITA)], [SHANAQITA, SAHEL]);

    await userEvent.click(screen.getByRole("button", { name: "أهل الساحل" }));

    expect(screen.getByText("لا يوجد مسجل مطابق")).toBeDefined();
  });

  it("searches inside the team it is filtered to", async () => {
    show(
      [],
      [player("r1", "أحمد ولد محمد", SHANAQITA), player("r2", "أحمد ولد سالم", SAHEL)],
      [SHANAQITA, SAHEL],
    );

    await userEvent.click(screen.getByRole("button", { name: "الشناقطة" }));
    await userEvent.type(screen.getByPlaceholderText(/ابحث في المسجلين/), "احمد");

    expect(screen.getByText("أحمد ولد محمد")).toBeDefined();
    expect(screen.queryByText("أحمد ولد سالم")).toBeNull();
  });
});
