import { describe, it, expect } from "vitest";
import { hoursLabel } from "@/lib/arabicPlural";

describe("hoursLabel", () => {
  it("names one hour rather than counting it", () => {
    expect(hoursLabel(1)).toBe("ساعة واحدة");
  });

  it("uses the dual for two, which Arabic has and English does not", () => {
    expect(hoursLabel(2)).toBe("ساعتين");
  });

  it("uses the plural noun from three to ten", () => {
    expect(hoursLabel(3)).toBe("3 ساعات");
    expect(hoursLabel(10)).toBe("10 ساعات");
  });

  it("returns to the singular noun from eleven up", () => {
    expect(hoursLabel(11)).toBe("11 ساعة");
    expect(hoursLabel(24)).toBe("24 ساعة");
    expect(hoursLabel(720)).toBe("720 ساعة");
  });

  it("never leaves a bare number, whatever the count", () => {
    for (let n = 1; n <= 720; n++) expect(hoursLabel(n)).toMatch(/ساع/);
  });
});
