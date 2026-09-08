import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfileList from "./ProfileList";

const ROWS = [{ key: "r1", main: "الأول", aside: "جانبي" }];

describe("a list on the member page", () => {
  it("draws the rows it was given under the count in its title", () => {
    render(<ProfileList icon="trophy" title="الأنشطة (1)" rows={ROWS} />);

    expect(screen.getByText("الأول")).toBeTruthy();
    expect(screen.getByText("الأنشطة (1)")).toBeTruthy();
  });

  it("says its line where it has none and was given one to say", () => {
    render(
      <ProfileList icon="list" title="سجل التغييرات (0)" empty="لا توجد تغييرات مسجلة" rows={[]} />,
    );

    expect(screen.getByText("لا توجد تغييرات مسجلة")).toBeTruthy();
  });

  it("says nothing where it has no rows and no line", () => {
    const { container } = render(<ProfileList icon="heart" title="التبرعات (0)" rows={[]} />);

    expect(container.querySelector("p")).toBeNull();
    expect(container.querySelector("ul")).toBeNull();
  });
});
