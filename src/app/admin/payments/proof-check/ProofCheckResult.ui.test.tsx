import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProofCheckResult, { type CheckedRow } from "./ProofCheckResult";
import { proofCheck, proofReuse } from "@/lib/texts";

function row(over: Partial<CheckedRow> = {}): CheckedRow {
  return {
    kind: "donation",
    id: "d1",
    label: "محمد",
    date: "2026-07-14T16:20:00.000Z",
    amount: 500,
    state: "ACTIVE",
    href: "/admin/payments?focus=d1",
    ...over,
  };
}

describe("the answer the proof checker gives", () => {
  it("says plainly that nothing carries this file", () => {
    render(<ProofCheckResult rows={[]} />);

    expect(screen.getByText(proofCheck.nothingTitle)).toBeTruthy();
  });

  it("says that a negative answer is not a clearance", () => {
    render(<ProofCheckResult rows={[]} />);

    expect(screen.getByText(proofCheck.nothingNote)).toBeTruthy();
  });

  it("never calls an unseen file new", () => {
    render(<ProofCheckResult rows={[]} />);

    expect(screen.queryByText(proofReuse.title)).toBeNull();
  });

  it("names the record the file is attached to, with a way in", () => {
    render(<ProofCheckResult rows={[row()]} />);

    expect(screen.getByText(proofReuse.title)).toBeTruthy();
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/admin/payments?focus=d1");
    expect(link.textContent).toContain("محمد");
    expect(link.textContent).toContain(proofReuse.donation);
  });

  it("carries the amount and the state of that record", () => {
    render(<ProofCheckResult rows={[row()]} />);

    const link = screen.getByRole("link");
    expect(link.textContent).toContain("500");
    expect(link.textContent).toContain(proofCheck.stateActive);
  });

  it("leaves the state out for a record that has none", () => {
    render(<ProofCheckResult rows={[row({ kind: "expense", label: "كرات", state: null })]} />);

    expect(screen.queryByText(new RegExp(proofCheck.stateActive))).toBeNull();
  });

  it("shows the hour the money moved, so two records on one day read apart", () => {
    render(<ProofCheckResult rows={[row()]} />);

    expect(screen.getByRole("link").textContent).toContain("16:20");
  });
});
