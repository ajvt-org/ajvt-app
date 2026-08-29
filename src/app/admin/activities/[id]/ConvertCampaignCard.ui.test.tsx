import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import ConvertCampaignCard from "./ConvertCampaignCard";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";

const patch = vi.fn();
const toast = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { patch: (...args: unknown[]) => patch(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock("@/components/Toast", () => ({ useToast: () => toast }));

type Registration = ActivityDetail["activity"]["registrations"][number];

function waiting(id: string, status: Registration["status"]): Registration {
  return {
    id,
    status,
    createdAt: "2026-01-01",
    paymentProof: null,
    rejectionReason: null,
    member: { id: `m-${id}`, fullName: "محمد", age: "البدريين", photo: null, phone: null },
  };
}

function activity(over: Partial<ActivityDetail["activity"]> = {}): ActivityDetail["activity"] {
  return {
    id: "a1",
    title: "حملة النظافة",
    description: "",
    period: null,
    startsAt: null,
    endsAt: null,
    withTime: false,
    photo: null,
    capacity: null,
    isOpen: true,
    autoApprove: false,
    showScorersAndCards: true,
    isTournament: false,
    format: null,
    profile: "FOOTBALL",
    teamSize: null,
    isVolunteer: false,
    whatsappLink: null,
    registrations: [],
    teams: [],
    _count: { matches: 0, groups: 0 },
    ...over,
  };
}

function show(over: Partial<ActivityDetail["activity"]> = {}) {
  cleanup();
  const onChanged = vi.fn();
  render(<ConvertCampaignCard activity={activity(over)} onChanged={onChanged} />);
  return onChanged;
}

const LINK = "https://chat.whatsapp.com/abc";

function link() {
  return (screen.getByLabelText("رابط مجموعة الواتساب") as HTMLInputElement).value;
}

function fillLink(value = LINK) {
  fireEvent.change(screen.getByLabelText("رابط مجموعة الواتساب"), { target: { value } });
}

describe("ConvertCampaignCard", () => {
  beforeEach(() => {
    patch.mockReset().mockResolvedValue({});
    toast.mockReset();
  });

  it("converts with the whatsapp link when nothing is waiting", async () => {
    const onChanged = show();

    fireEvent.click(screen.getByRole("button", { name: "تحويل إلى حملة تطوعية" }));
    fillLink();
    fireEvent.click(screen.getByRole("button", { name: "تأكيد التحويل" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(patch).toHaveBeenCalledWith("/api/admin/activities/a1", {
      isVolunteer: true,
      whatsappLink: LINK,
    });
  });

  it("starts the link from the one the activity already has", () => {
    show({ whatsappLink: LINK });

    fireEvent.click(screen.getByRole("button", { name: "تحويل إلى حملة تطوعية" }));

    expect(link()).toBe(LINK);
  });

  it("asks what to do with the registrations still waiting", () => {
    show({ registrations: [waiting("r1", "PENDING"), waiting("r2", "PENDING")] });

    fireEvent.click(screen.getByRole("button", { name: "تحويل إلى حملة تطوعية" }));

    expect(screen.getByText("2 طلبات تسجيل ما تزال في الانتظار")).toBeTruthy();
    expect(screen.getByRole("button", { name: "اقبلها كلها" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "ارفضها كلها" })).toBeTruthy();
  });

  it("counts only what is still waiting", () => {
    show({ registrations: [waiting("r1", "PENDING"), waiting("r2", "ACTIVE")] });

    fireEvent.click(screen.getByRole("button", { name: "تحويل إلى حملة تطوعية" }));

    expect(screen.getByText("طلب تسجيل واحد ما يزال في الانتظار")).toBeTruthy();
  });

  it("sends the choice to accept them all", async () => {
    show({ registrations: [waiting("r1", "PENDING")] });

    fireEvent.click(screen.getByRole("button", { name: "تحويل إلى حملة تطوعية" }));
    fillLink();
    fireEvent.click(screen.getByRole("button", { name: "اقبلها كلها" }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/activities/a1", {
        isVolunteer: true,
        whatsappLink: LINK,
        settlePending: "accept",
      }),
    );
  });

  it("sends the choice to reject them all", async () => {
    show({ registrations: [waiting("r1", "PENDING")] });

    fireEvent.click(screen.getByRole("button", { name: "تحويل إلى حملة تطوعية" }));
    fillLink();
    fireEvent.click(screen.getByRole("button", { name: "ارفضها كلها" }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/activities/a1", {
        isVolunteer: true,
        whatsappLink: LINK,
        settlePending: "reject",
      }),
    );
  });

  it("takes the campaign back to an ordinary activity", async () => {
    show({ isVolunteer: true, whatsappLink: LINK });

    fireEvent.click(screen.getByRole("button", { name: "إلغاء وضع الحملة" }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/activities/a1", { isVolunteer: false }),
    );
  });

  it("keeps the dialog open and says why when the server refuses", async () => {
    patch.mockRejectedValue(new Error("رابط مجموعة الواتساب مطلوب لحملات التطوع"));
    show();

    fireEvent.click(screen.getByRole("button", { name: "تحويل إلى حملة تطوعية" }));
    fireEvent.click(screen.getByRole("button", { name: "تأكيد التحويل" }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("رابط مجموعة الواتساب مطلوب لحملات التطوع", "error"),
    );
    expect(link()).toBe("");
  });
});
