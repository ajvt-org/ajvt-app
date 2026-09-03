import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import PlayerAvatar from "./PlayerAvatar";
import { INITIALS_JOINER } from "@/lib/arabicName";

function show(props: { photo?: string | null; fullName: string; bg?: "mint" | "copper" }) {
  cleanup();
  return render(<PlayerAvatar photo={props.photo ?? null} {...props} />);
}

describe("PlayerAvatar", () => {
  it("writes the initials of a player who has no photo", () => {
    const { container } = show({ fullName: "عبد الله ولد إبراهيم" });

    expect(container.textContent).toBe("ع" + INITIALS_JOINER + "إ");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("gives a one word name its one letter", () => {
    const { container } = show({ fullName: "إبراهيم" });

    expect(container.textContent).toBe("إ");
  });

  it("falls back to the glyph when there is no name to read", () => {
    const { container } = show({ fullName: "" });

    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("keeps the mint placeholder and takes its ink from the same family", () => {
    const { container } = show({ fullName: "سيدي محمد" });

    const style = container.querySelector("span")?.getAttribute("style") ?? "";
    expect(style).toContain("var(--mint-100)");
    expect(style).toContain("var(--mint-700)");
  });

  it("keeps the copper placeholder where a caller asked for it", () => {
    const { container } = show({ fullName: "سيدي محمد", bg: "copper" });

    const style = container.querySelector("span")?.getAttribute("style") ?? "";
    expect(style).toContain("var(--copper-300)");
    expect(style).toContain("var(--copper-700)");
  });

  it("leaves the photo alone when there is one", () => {
    const { container } = show({ photo: "abc.jpg", fullName: "سيدي محمد" });

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("alt")).toBe("سيدي محمد");
  });

  it("says nothing to a screen reader, which reads the name beside it", () => {
    const { container } = show({ fullName: "سيدي محمد" });

    expect(container.querySelector("span")?.getAttribute("aria-hidden")).toBe("true");
  });
});
