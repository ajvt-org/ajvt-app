import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminOriginProvider } from "./adminOrigin";
import RosterRow from "@/components/admin/tournament/RosterRow";
import type { TeamMemberEntry } from "@/components/admin/tournament/types";

const pathname = vi.fn(() => "/admin/activities/a1");
const search = vi.fn(() => new URLSearchParams("tab=teams"));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
  useSearchParams: () => search(),
}));

const NAME = "الحسن احمدو";

const entry: TeamMemberEntry = {
  status: "ACTIVE",
  member: { id: "p1", fullName: NAME, phone: "36000001", age: "البدريين", photo: null },
};

const handlers = {
  onToggleCaptain: vi.fn(),
  onApprove: vi.fn(),
  onRemove: vi.fn(),
};

function row() {
  return <RosterRow entry={entry} suspended={false} captain={false} busy={false} {...handlers} />;
}

describe("the origin an admin screen hands to a member card link", () => {
  it("carries the tab the player was opened from", () => {
    render(<AdminOriginProvider>{row()}</AdminOriginProvider>);

    expect(screen.getByLabelText(`فتح بطاقة ${NAME}`).getAttribute("href")).toBe(
      "/admin/members/p1?from=%2Fadmin%2Factivities%2Fa1%3Ftab%3Dteams",
    );
  });

  it("leaves the plain card path when no screen provided one", () => {
    render(row());

    expect(screen.getByLabelText(`فتح بطاقة ${NAME}`).getAttribute("href")).toBe(
      "/admin/members/p1",
    );
  });
});
