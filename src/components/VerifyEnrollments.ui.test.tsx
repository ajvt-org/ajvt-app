import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import VerifyEnrollments from "./VerifyEnrollments";
import type { EnrollmentItem } from "@/lib/verifyEnrollments";

afterEach(cleanup);

const item = (over: Partial<EnrollmentItem> = {}): EnrollmentItem => ({
  id: "act-1",
  label: "بطولة الصيف",
  photo: null,
  startsAt: new Date("2026-06-01"),
  endsAt: new Date("2026-06-30"),
  isVolunteer: false,
  kind: "activity",
  ...over,
});

function iconPath(container: HTMLElement, index = 0): string | null {
  return container.querySelectorAll(".activity-thumb svg path")[index]?.getAttribute("d") ?? null;
}

describe("VerifyEnrollments", () => {
  it("renders nothing when the list is empty", () => {
    const { container } = render(<VerifyEnrollments items={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("renders one row per enrollment, labelled", () => {
    const { container } = render(
      <VerifyEnrollments
        items={[item(), item({ id: "quiz-1", label: "مسابقة رمضان", kind: "competition" })]}
      />,
    );

    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect([...container.querySelectorAll(".activity-title")].map((n) => n.textContent)).toEqual([
      "بطولة الصيف",
      "مسابقة رمضان",
    ]);
  });

  it("tells a competition apart from an activity by its icon", () => {
    const { container: activity } = render(<VerifyEnrollments items={[item()]} />);
    const { container: competition } = render(
      <VerifyEnrollments items={[item({ id: "quiz-1", kind: "competition" })]} />,
    );

    expect(iconPath(activity)).not.toBeNull();
    expect(iconPath(competition)).not.toBe(iconPath(activity));
  });

  it("gives a volunteer campaign its own icon", () => {
    const { container: plain } = render(<VerifyEnrollments items={[item()]} />);
    const { container: volunteer } = render(
      <VerifyEnrollments items={[item({ id: "act-2", isVolunteer: true })]} />,
    );

    expect(iconPath(volunteer)).not.toBe(iconPath(plain));
  });

  it("shows the activity photo when there is one", () => {
    const { container } = render(<VerifyEnrollments items={[item({ photo: "summer.webp" })]} />);

    expect(container.querySelector("img.activity-thumb")?.getAttribute("src")).toBe(
      "/api/files/activity/summer-thumb.webp",
    );
  });

  it("marks an undated activity as not scheduled yet", () => {
    const { container } = render(
      <VerifyEnrollments items={[item({ startsAt: null, endsAt: null })]} />,
    );

    expect(container.textContent).toContain("غير مبرمج بعد");
  });
});
