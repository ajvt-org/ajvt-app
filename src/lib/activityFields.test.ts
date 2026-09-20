import { describe, it, expect } from "vitest";
import { given, volunteerProblem } from "./activityFields";
import { activities } from "./messages";

const shape = { isTournament: false, isVolunteer: false, whatsappLink: null };

describe("given", () => {
  it("keeps the keys the caller set", () => {
    expect(given({ a: 1, b: "x" })).toEqual({ a: 1, b: "x" });
  });

  it("drops the keys left undefined", () => {
    expect(given({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it("keeps a key set to null, since null is a value", () => {
    expect(given({ a: null })).toEqual({ a: null });
  });
});

describe("volunteerProblem", () => {
  it("accepts an activity that is neither a tournament nor a campaign", () => {
    expect(volunteerProblem(shape)).toBeNull();
  });

  it("accepts a tournament with no whatsapp link", () => {
    expect(volunteerProblem({ ...shape, isTournament: true })).toBeNull();
  });

  it("refuses an activity that is a tournament and a campaign at once", () => {
    expect(volunteerProblem({ ...shape, isTournament: true, isVolunteer: true })).toBe(
      activities.tournamentAndVolunteer,
    );
  });

  it("refuses a campaign with no whatsapp link", () => {
    expect(volunteerProblem({ ...shape, isVolunteer: true })).toBe(activities.whatsappRequired);
  });

  it("refuses a campaign whose link is blank or is not a url", () => {
    expect(volunteerProblem({ ...shape, isVolunteer: true, whatsappLink: "   " })).toBe(
      activities.whatsappRequired,
    );
    expect(volunteerProblem({ ...shape, isVolunteer: true, whatsappLink: "chat.whatsapp" })).toBe(
      activities.whatsappRequired,
    );
  });

  it("accepts a campaign whose link is a url, padded or not", () => {
    const padded = { ...shape, isVolunteer: true, whatsappLink: " https://chat.whatsapp.com/x " };
    expect(volunteerProblem(padded)).toBeNull();
    expect(
      volunteerProblem({ ...shape, isVolunteer: true, whatsappLink: "http://chat.whatsapp.com/x" }),
    ).toBeNull();
  });
});
