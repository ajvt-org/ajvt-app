import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import ProfileSection from "./ProfileSection";

const TITLE = "عضويتي";

const section = (container: HTMLElement) => container.querySelector("section")!;

function Nothing() {
  return null;
}

function ArrivesLate() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(id);
  }, []);
  return ready ? <div>وصل متأخراً</div> : null;
}

describe("ProfileSection", () => {
  it("heads the group when there is something under it", () => {
    const { container } = render(
      <ProfileSection title={TITLE}>
        <div>بطاقة</div>
      </ProfileSection>,
    );

    expect(section(container).hidden).toBe(false);
    expect(section(container).textContent).toContain(TITLE);
  });

  it("draws nothing at all, heading included, when every block under it draws nothing", async () => {
    const { container } = render(
      <ProfileSection title={TITLE}>
        <Nothing />
      </ProfileSection>,
    );

    await waitFor(() => expect(section(container).hidden).toBe(true));
  });

  it("appears once a block that fetches its own rows has something to show", async () => {
    const { container } = render(
      <ProfileSection title={TITLE}>
        <ArrivesLate />
      </ProfileSection>,
    );

    await waitFor(() => expect(section(container).hidden).toBe(false));
  });
});
