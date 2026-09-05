import { describe, it, expect } from "vitest";
import { entrantIdentities, namedEntrant } from "./entrantName";

const entrant = (
  id: string,
  name: string,
  autoNamed: boolean,
  members: { fullName: string; photo?: string | null }[],
) => ({ id, name, autoNamed, members: members.map((member) => ({ member })) });

describe("entrantIdentities", () => {
  it("names a singles entrant after the player rather than the placeholder", () => {
    const identities = entrantIdentities(
      [entrant("t1", "فريق 1", true, [{ fullName: "أحمد ولد محمد" }])],
      { min: 1, max: 1 },
    );

    expect(identities.get("t1")?.name).toBe("أحمد ولد محمد");
  });

  it("gives a singles entrant the player photo", () => {
    const identities = entrantIdentities(
      [entrant("t1", "فريق 1", true, [{ fullName: "أحمد", photo: "a.webp" }])],
      { min: 1, max: 1 },
    );

    expect(identities.get("t1")?.photo).toBe("a.webp");
  });

  it("leaves a team entrant without a player photo", () => {
    const identities = entrantIdentities(
      [entrant("t1", "نجوم القرية", false, [{ fullName: "أحمد", photo: "a.webp" }])],
      { min: null, max: null },
    );

    expect(identities.get("t1")).toEqual({ name: "نجوم القرية", photo: null });
  });

  it("joins the pair on a doubles entrant", () => {
    const identities = entrantIdentities(
      [entrant("t1", "فريق 1", true, [{ fullName: "أحمد" }, { fullName: "سالم" }])],
      { min: 2, max: 2 },
    );

    expect(identities.get("t1")?.name).toBe("أحمد و سالم");
  });

  it("keeps a name the admin typed", () => {
    const identities = entrantIdentities(
      [entrant("t1", "نجوم القرية", false, [{ fullName: "أحمد" }])],
      { min: 1, max: 1 },
    );

    expect(identities.get("t1")?.name).toBe("نجوم القرية");
  });

  it("leaves a tournament with no team size alone", () => {
    const identities = entrantIdentities([entrant("t1", "فريق 1", true, [{ fullName: "أحمد" }])], {
      min: null,
      max: null,
    });

    expect(identities.get("t1")?.name).toBe("فريق 1");
  });
});

describe("namedEntrant", () => {
  it("renames a side of a match and carries the player photo", () => {
    const identities = new Map([["t1", { name: "أحمد ولد محمد", photo: "a.webp" }]]);

    expect(namedEntrant({ id: "t1", name: "فريق 1", logo: null }, identities)).toEqual({
      id: "t1",
      name: "أحمد ولد محمد",
      logo: null,
      photo: "a.webp",
    });
  });

  it("leaves a side that is not known yet as it is", () => {
    expect(namedEntrant(null, new Map())).toBeNull();
  });

  it("keeps the name it has when the entrant is not in the map", () => {
    expect(namedEntrant({ id: "t9", name: "فريق 9" }, new Map()).name).toBe("فريق 9");
  });
});
