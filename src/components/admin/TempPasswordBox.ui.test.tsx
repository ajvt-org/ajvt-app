import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TempPasswordBox from "./TempPasswordBox";
import { tempPassword } from "@/lib/texts";

describe("the box that carries a temporary password", () => {
  it("opens a chat with that member, with the password written into it", () => {
    render(<TempPasswordBox value="J2AF3JQL4D" hours={1} phone="41015838" />);

    const link = screen.getByRole("link", { name: tempPassword.send }) as HTMLAnchorElement;

    expect(link.href).toContain("wa.me/22241015838");
    expect(decodeURIComponent(link.href)).toContain("J2AF3JQL4D");
    expect(decodeURIComponent(link.href)).toContain("ساعة واحدة");
  });

  it("offers no chat for an account with no number", () => {
    render(<TempPasswordBox value="J2AF3JQL4D" hours={1} phone={null} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("J2AF3JQL4D")).toBeTruthy();
    expect(screen.getByRole("button", { name: tempPassword.copy })).toBeTruthy();
  });
});
