import { describe, it, expect } from "vitest";
import { OTHER_VILLAGE } from "@/lib/villages";
import { ageOptions, villageOptions } from "./filterOptions";

describe("the options the member filters offer", () => {
  it("lists every village and then the other option", () => {
    expect(villageOptions([{ id: "v1", name: "أفجار" }]).map((o) => o.value)).toEqual([
      "أفجار",
      OTHER_VILLAGE,
    ]);
  });

  it("lists every age group by its name", () => {
    expect(ageOptions([{ id: "g1", name: "البدريين" }])).toEqual([
      { value: "البدريين", label: "البدريين" },
    ]);
  });
});
