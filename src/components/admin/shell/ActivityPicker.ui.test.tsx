import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ROLE_LABELS } from "@/lib/adminRoles";
import { SCOPED_ROLE } from "@/lib/activityAccess";
import { activityPicker as texts } from "@/lib/texts";
import ActivityPicker from "./ActivityPicker";
import type { AdminAccount } from "./accountTypes";

function mockActivities() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ activities: [{ id: "a1", title: "دوري الصيف" }] }),
    }),
  );
}

const ACCOUNT: AdminAccount = {
  id: "ad1",
  username: "سالم",
  role: "MEMBERS",
  activities: [],
  lastLoginAt: null,
  lastLoginIp: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function show() {
  render(<ActivityPicker account={ACCOUNT} onBack={vi.fn()} onSaved={async () => {}} />);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("picking the activities an admin is held to", () => {
  it("says the role the account is about to be given", async () => {
    mockActivities();
    show();

    await waitFor(() => expect(screen.getByText("دوري الصيف")).toBeTruthy());
    expect(screen.getByText(texts.scope(ROLE_LABELS[SCOPED_ROLE]))).toBeTruthy();
  });

  it("names the account it is scoping", () => {
    mockActivities();
    show();

    expect(screen.getByText(texts.title("سالم"))).toBeTruthy();
  });
});
