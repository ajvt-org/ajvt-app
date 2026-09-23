import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ElectionView from "./ElectionView";
import type { ElectionDetailPayload } from "./electionTypes";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

const LONG = "محمد الأمين ولد أحمد ولد سيدي";

function payload(over: Partial<ElectionDetailPayload> = {}, when = DAY): ElectionDetailPayload {
  return {
    election: {
      id: "e1",
      title: "انتخاب اللجنة",
      startsAt: new Date(Date.now() + when).toISOString(),
      durationMinutes: 600,
      allowBlank: false,
      shuffleCandidates: false,
      showResults: true,
      candidates: [
        { id: "c1", fullName: LONG, photo: null },
        { id: "c2", fullName: "فاطمة بنت سيدي", photo: "poster.webp" },
      ],
    },
    signedIn: false,
    canVote: false,
    myCandidateId: null,
    voted: false,
    result: null,
    ...over,
  };
}

function show(state: ElectionDetailPayload) {
  return render(
    <ElectionView
      payload={state}
      backHref="/elections"
      membershipHref="/membership"
      onReached={vi.fn()}
    />,
  );
}

describe("one election on the member screen", () => {
  it("reads the candidates before the window opens", () => {
    show(payload());

    expect(screen.getByText(LONG)).toBeTruthy();
    expect(screen.getByText("فاطمة بنت سيدي")).toBeTruthy();
  });

  it("counts down to the opening before it opens", () => {
    show(payload());

    expect(screen.getByText("يبدأ التصويت بعد")).toBeTruthy();
    expect(screen.getByLabelText("الوقت المتبقي لبداية التصويت")).toBeTruthy();
  });

  it("counts down to the close once it is open, with a bar beside it", () => {
    show(payload({}, -HOUR));

    expect(screen.getByText("ينتهي التصويت بعد")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "ما تبقى من مدة التصويت" })).toBeTruthy();
  });

  it("tells a visitor to sign in rather than showing them a button that refuses", () => {
    show(payload({ signedIn: false, canVote: false }, -HOUR));

    expect(screen.getByText("سجّل الدخول للتصويت")).toBeTruthy();
    expect(screen.getByRole("link", { name: /تسجيل الدخول/ })).toBeTruthy();
  });

  it("tells a signed in account that has not paid that the vote is for members", () => {
    show(payload({ signedIn: true, canVote: false }, -HOUR));

    expect(screen.getByText("التصويت للمنتسبين فقط")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /تسجيل الدخول/ })).toBeNull();
  });

  it("says none of that to a member who may vote", () => {
    show(payload({ signedIn: true, canVote: true }, -HOUR));

    expect(screen.queryByText("التصويت للمنتسبين فقط")).toBeNull();
    expect(screen.queryByText("سجّل الدخول للتصويت")).toBeNull();
  });

  it("serves a candidate photograph through the public candidate route", () => {
    show(payload());

    expect(screen.getByAltText("فاطمة بنت سيدي").getAttribute("src")).toContain(
      "/api/files/candidate/",
    );
  });

  it("writes a long name out in full", () => {
    const { container } = show(payload());

    const name = screen.getByText(LONG);
    expect(name.className).toContain("activity-title");
    expect(name.className).not.toContain("truncate");
    expect(container.querySelectorAll(".line-clamp-2")).toHaveLength(0);
  });

  it("offers the vote to a member once the window is open", () => {
    show(payload({ signedIn: true, canVote: true }, -HOUR));

    expect(screen.getByRole("button", { name: "تأكيد التصويت" })).toBeTruthy();
  });

  it("offers no vote before the window opens, however paid up the reader is", () => {
    show(payload({ signedIn: true, canVote: true }));

    expect(screen.queryByRole("button", { name: "تأكيد التصويت" })).toBeNull();
    expect(screen.getByText(LONG)).toBeTruthy();
  });

  it("offers no vote once the window has closed", () => {
    show(payload({ signedIn: true, canVote: true }, -20 * HOUR));

    expect(screen.queryByRole("button", { name: "تأكيد التصويت" })).toBeNull();
  });

  it("keeps the whole list after voting, the voter's choice marked", () => {
    show(payload({ signedIn: true, canVote: true, voted: true, myCandidateId: "c1" }, -HOUR));

    const mine = screen.getByText(LONG).closest(".card") as HTMLElement;
    const other = screen.getByText("فاطمة بنت سيدي").closest(".card") as HTMLElement;
    expect(mine.getAttribute("aria-current")).toBe("true");
    expect(mine.style.border).toContain("var(--mint-500)");
    expect(mine.querySelector("svg")).not.toBeNull();
    expect(other.getAttribute("aria-current")).toBeNull();
    expect(other.querySelector("svg")).toBeNull();
    expect(screen.queryByRole("button", { name: "تأكيد التصويت" })).toBeNull();
    expect(screen.queryByRole("button", { name: LONG })).toBeNull();
  });

  it("puts the check ahead of the name on the marked row", () => {
    show(payload({ signedIn: true, canVote: true, voted: true, myCandidateId: "c1" }, -HOUR));

    const mine = screen.getByText(LONG).closest(".card") as HTMLElement;
    expect(mine.firstElementChild!.querySelector("svg")).not.toBeNull();
  });

  it("marks the blank row for a voter who cast a blank ballot", () => {
    const state = payload(
      { signedIn: true, canVote: true, voted: true, myCandidateId: null },
      -HOUR,
    );
    state.election.allowBlank = true;
    show(state);

    const blank = screen.getByText("ورقة بيضاء").closest(".card") as HTMLElement;
    expect(blank.getAttribute("aria-current")).toBe("true");
    expect(screen.getByText(LONG).closest(".card")!.getAttribute("aria-current")).toBeNull();
  });

  it("writes no sentence about the ballot", () => {
    show(payload({ signedIn: true, canVote: true, voted: true, myCandidateId: "c1" }, -HOUR));

    expect(screen.queryByText(/صوتك/)).toBeNull();
  });

  it("says so when no candidate has been named yet", () => {
    const state = payload();
    state.election.candidates = [];
    show(state);

    expect(screen.getByText("لم تعلن أسماء المترشحين بعد")).toBeTruthy();
  });
});

describe("the result on the member screen", () => {
  const tally = {
    electorate: 20,
    cast: 12,
    blank: 2,
    rows: [
      { candidateId: "c1", fullName: LONG, photo: null, votes: 7 },
      { candidateId: "c2", fullName: "فاطمة بنت سيدي", photo: null, votes: 3 },
    ],
  };

  it("shows no count at all while the window is open", () => {
    show(payload({ signedIn: true, canVote: true }, -HOUR));

    expect(screen.queryByText("نسبة المشاركة")).toBeNull();
  });

  it("says the vote is over and stops when the committee holds the result back", () => {
    show(payload({ result: null }, -20 * HOUR));

    expect(screen.getByText("انتهى التصويت")).toBeTruthy();
    expect(screen.getByText("لم تعلن النتيجة بعد")).toBeTruthy();
    expect(screen.queryByText("نسبة المشاركة")).toBeNull();
  });

  it("draws the tally once the committee has published it", () => {
    show(payload({ result: tally }, -20 * HOUR));

    expect(screen.getByText("نسبة المشاركة")).toBeTruthy();
    expect(screen.getByText("60%")).toBeTruthy();
    expect(screen.getByText("7 (58%)")).toBeTruthy();
  });

  it("stops repeating the candidate list under a published result", () => {
    show(payload({ result: tally }, -20 * HOUR));

    expect(screen.queryByText("المترشحون")).toBeNull();
  });

  it("still names who stood when the result is held back", () => {
    show(payload({ result: null }, -20 * HOUR));

    expect(screen.getByText("المترشحون")).toBeTruthy();
    expect(screen.getByText(LONG)).toBeTruthy();
  });
});
