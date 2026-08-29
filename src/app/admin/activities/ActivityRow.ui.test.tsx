import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ActivityRow from "./ActivityRow";
import type { Activity } from "./activityTypes";

function activity(over: Partial<Activity> = {}): Activity {
  return {
    id: "a1",
    title: "كأس رابطة شباب التاكلالت",
    description: "",
    period: null,
    startsAt: null,
    endsAt: null,
    withTime: false,
    photo: null,
    capacity: null,
    isOpen: true,
    isTournament: true,
    isVolunteer: false,
    whatsappLink: null,
    order: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    registrations: [],
    pendingJoinRequests: 0,
    ...over,
  };
}

function show(over: Partial<Activity> = {}) {
  render(
    <ActivityRow
      activity={activity(over)}
      canReorder={null}
      reorderLoading={false}
      onMove={vi.fn()}
    />,
  );
}

describe("what an activity row says is waiting", () => {
  it("says a team is waiting to join", () => {
    show({ pendingJoinRequests: 1 });

    expect(screen.getByText("1 طلب انضمام")).toBeTruthy();
  });

  it("counts several waiting teams", () => {
    show({ pendingJoinRequests: 3 });

    expect(screen.getByText("3 طلب انضمام")).toBeTruthy();
  });

  it("says nothing when no team is waiting", () => {
    show();

    expect(screen.queryByText(/طلب انضمام/)).toBeNull();
  });

  it("keeps join requests apart from registrations waiting review", () => {
    show({
      pendingJoinRequests: 1,
      registrations: [
        {
          id: "r1",
          status: "PENDING",
          paymentProof: null,
          rejectionReason: null,
          member: { id: "m1", fullName: "محمد", phone: null, age: "البدريين" },
        },
      ],
    });

    expect(screen.getByText("1 طلب انضمام")).toBeTruthy();
    expect(screen.getByText("1 في الانتظار")).toBeTruthy();
  });
});
