import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BallotPicker from "./BallotPicker";
import { api } from "@/lib/api";
import type { MemberCandidate } from "./electionTypes";

const candidates: MemberCandidate[] = [
  { id: "c1", fullName: "محمد الأمين ولد أحمد", photo: null },
  { id: "c2", fullName: "فاطمة بنت سيدي", photo: "poster.webp" },
];

function show(allowBlank = false, onCast = vi.fn()) {
  render(
    <BallotPicker
      electionId="e1"
      candidates={candidates}
      allowBlank={allowBlank}
      onCast={onCast}
    />,
  );
  return onCast;
}

const confirmButton = () => screen.getByRole("button", { name: "تأكيد التصويت" });

beforeEach(() => {
  vi.spyOn(api, "post").mockResolvedValue({ voted: true } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("picking before casting", () => {
  it("sends nothing when a candidate is tapped", () => {
    show();

    fireEvent.click(screen.getByRole("button", { name: candidates[0].fullName }));

    expect(api.post).not.toHaveBeenCalled();
  });

  it("marks the tapped candidate as the chosen one", () => {
    show();

    fireEvent.click(screen.getByRole("button", { name: candidates[0].fullName }));

    expect(
      screen.getByRole("button", { name: candidates[0].fullName }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: candidates[1].fullName }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("moves the mark when a second candidate is tapped", () => {
    show();

    fireEvent.click(screen.getByRole("button", { name: candidates[0].fullName }));
    fireEvent.click(screen.getByRole("button", { name: candidates[1].fullName }));

    expect(
      screen.getByRole("button", { name: candidates[1].fullName }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("will not cast until somebody has been picked", () => {
    show();

    expect(confirmButton().hasAttribute("disabled")).toBe(true);
  });
});

describe("the dialog that stands between the tap and the ballot", () => {
  it("names the chosen candidate and says the vote cannot be changed", () => {
    show();

    fireEvent.click(screen.getByRole("button", { name: candidates[0].fullName }));
    fireEvent.click(confirmButton());

    expect(screen.getByText(`ستصوّت لـ ${candidates[0].fullName}`)).toBeTruthy();
    expect(screen.getByText("لا يمكن تغيير صوتك بعد تأكيده")).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("casts the chosen ballot on confirming", async () => {
    const onCast = show();

    fireEvent.click(screen.getByRole("button", { name: candidates[1].fullName }));
    fireEvent.click(confirmButton());
    fireEvent.click(screen.getAllByRole("button", { name: "تأكيد التصويت" }).at(-1)!);

    await waitFor(() => expect(onCast).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith("/api/elections/e1/vote", { candidateId: "c2" });
  });

  it("leaves the selection alone when the dialog is closed", () => {
    show();

    fireEvent.click(screen.getByRole("button", { name: candidates[0].fullName }));
    fireEvent.click(confirmButton());
    fireEvent.click(screen.getByRole("button", { name: "إغلاق" }));

    expect(
      screen.getByRole("button", { name: candidates[0].fullName }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe("the blank ballot", () => {
  it("is not offered when the election does not allow one", () => {
    show(false);

    expect(screen.queryByRole("button", { name: "ورقة بيضاء" })).toBeNull();
  });

  it("sits at the end of the list, after every candidate", () => {
    const { container } = render(
      <BallotPicker electionId="e1" candidates={candidates} allowBlank onCast={vi.fn()} />,
    );

    const labels = [...container.querySelectorAll("[aria-pressed]")].map((el) =>
      el.getAttribute("aria-label"),
    );
    expect(labels.at(-1)).toBe("ورقة بيضاء");
  });

  it("names the blank rather than a person in the dialog", () => {
    render(<BallotPicker electionId="e1" candidates={candidates} allowBlank onCast={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "ورقة بيضاء" }));
    fireEvent.click(confirmButton());

    expect(screen.getByText("ستصوّت بورقة بيضاء")).toBeTruthy();
  });

  it("posts a null candidate for the blank", async () => {
    const onCast = vi.fn();
    render(<BallotPicker electionId="e1" candidates={candidates} allowBlank onCast={onCast} />);

    fireEvent.click(screen.getByRole("button", { name: "ورقة بيضاء" }));
    fireEvent.click(confirmButton());
    fireEvent.click(screen.getAllByRole("button", { name: "تأكيد التصويت" }).at(-1)!);

    await waitFor(() => expect(onCast).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith("/api/elections/e1/vote", { candidateId: null });
  });
});

describe("the check on a picked row", () => {
  it("sits ahead of the name, where the marked row carries it after voting", () => {
    render(
      <BallotPicker electionId="e1" candidates={candidates} allowBlank={false} onCast={vi.fn()} />,
    );

    const row = screen.getByRole("button", { name: candidates[0].fullName });
    fireEvent.click(row);

    expect(row.firstElementChild!.querySelector("svg")).not.toBeNull();
  });
});
