import { describe, it, expect } from "vitest";
import { entrantNames, namedEntrant } from "./entrantName";

const entrant = (id: string, name: string, autoNamed: boolean, members: string[]) => ({
  id,
  name,
  autoNamed,
  members: members.map((fullName) => ({ member: { fullName } })),
});

describe("entrantNames", () => {
  it("names a singles entrant after the player rather than the placeholder", () => {
    const names = entrantNames([entrant("t1", "فريق 1", true, ["أحمد ولد محمد"])], 1);

    expect(names.get("t1")).toBe("أحمد ولد محمد");
  });

  it("joins the pair on a doubles entrant", () => {
    const names = entrantNames([entrant("t1", "فريق 1", true, ["أحمد", "سالم"])], 2);

    expect(names.get("t1")).toBe("أحمد و سالم");
  });

  it("keeps a name the admin typed", () => {
    const names = entrantNames([entrant("t1", "نجوم القرية", false, ["أحمد"])], 1);

    expect(names.get("t1")).toBe("نجوم القرية");
  });

  it("leaves a tournament with no team size alone", () => {
    const names = entrantNames([entrant("t1", "فريق 1", true, ["أحمد"])], null);

    expect(names.get("t1")).toBe("فريق 1");
  });
});

describe("namedEntrant", () => {
  it("renames a side of a match", () => {
    const names = new Map([["t1", "أحمد ولد محمد"]]);

    expect(namedEntrant({ id: "t1", name: "فريق 1", logo: null }, names)).toEqual({
      id: "t1",
      name: "أحمد ولد محمد",
      logo: null,
    });
  });

  it("leaves a side that is not known yet as it is", () => {
    expect(namedEntrant(null, new Map())).toBeNull();
  });

  it("keeps the name it has when the entrant is not in the map", () => {
    expect(namedEntrant({ id: "t9", name: "فريق 9" }, new Map()).name).toBe("فريق 9");
  });
});
