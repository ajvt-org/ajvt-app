import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FieldRow from "./FieldRow";

describe("FieldRow", () => {
  it("ties the label to the control it names", () => {
    render(
      <FieldRow label="الفريق">
        {(id) => (
          <select id={id}>
            <option value="a">الصقور</option>
          </select>
        )}
      </FieldRow>,
    );

    expect(screen.getByLabelText("الفريق").tagName).toBe("SELECT");
  });

  it("puts the label before the control, which reads as the right in a right to left page", () => {
    const { container } = render(
      <FieldRow label="الدقيقة">{(id) => <input id={id} type="number" />}</FieldRow>,
    );

    const row = container.firstElementChild!;
    expect(row.children[0].tagName).toBe("LABEL");
    expect(row.children[1].querySelector("input")).not.toBeNull();
  });

  it("carries a hint under the control when there is one", () => {
    render(
      <FieldRow label="المسجل" hint="المسجل يُختار من الفريق الآخر">
        {(id) => <input id={id} />}
      </FieldRow>,
    );

    expect(screen.getByText("المسجل يُختار من الفريق الآخر")).toBeDefined();
  });

  it("leaves the hint out when none is given", () => {
    render(<FieldRow label="الدقيقة">{(id) => <input id={id} />}</FieldRow>);

    expect(screen.getByLabelText("الدقيقة").parentElement?.children).toHaveLength(1);
  });
});
