import { describe, it, expect } from "vitest";
import { settingsForm } from "@/lib/texts";
import { SETTINGS_FIELDS, SETTINGS_GROUPS, cleanValue, groupedFields } from "./settingsFields";

const fieldFor = (key: string) => SETTINGS_FIELDS.find((field) => field.key === key);

describe("the hints the association settings carry", () => {
  it("says nothing under a label an admin already filled in", () => {
    for (const key of [
      "membershipFee",
      "membershipYear",
      "asksBankReference",
      "tempPasswordHours",
      "supportWhatsapp",
    ]) {
      expect(fieldFor(key)?.hint).toBeUndefined();
    }
  });

  it("keeps the one line that is about another document", () => {
    expect(fieldFor("treasurerName")?.hint).toBe(settingsForm.officerHint);
  });

  it("prints the officer line once for the two names it covers", () => {
    const withOfficerHint = SETTINGS_FIELDS.filter(
      (field) => field.hint === settingsForm.officerHint,
    );

    expect(withOfficerHint.map((field) => field.key)).toEqual(["treasurerName"]);
  });

  it("closes the run of officer names, so the line reads for both", () => {
    const keys = SETTINGS_FIELDS.map((field) => field.key);

    expect(keys.indexOf("treasurerName")).toBe(keys.indexOf("secretaryName") + 1);
    expect(keys.indexOf("treasurerName")).toBe(keys.length - 1);
  });
});

describe("the groups the association settings are shown in", () => {
  it("shows every field once, so none falls off the page", () => {
    const shown = groupedFields().flatMap((group) => group.fields.map((field) => field.key));

    expect(shown).toEqual(SETTINGS_FIELDS.map((field) => field.key));
  });

  it("leaves no group without fields", () => {
    expect(groupedFields().filter((group) => group.fields.length === 0)).toEqual([]);
  });

  it("keeps what the انتساب form does apart from the password and from the names", () => {
    const membership = groupedFields().find((group) => group.key === "membership");

    expect(membership?.fields.map((field) => field.key)).toEqual([
      "membershipFee",
      "membershipYear",
      "asksBankReference",
      "showsReferenceCode",
    ]);
  });

  it("holds the two officer names in the last group, where their line is printed", () => {
    const last = groupedFields().at(-1);

    expect(last?.key).toBe(SETTINGS_GROUPS.at(-1)?.key);
    expect(last?.fields.map((field) => field.key)).toEqual(["secretaryName", "treasurerName"]);
  });
});

describe("what a settings field does with what was typed", () => {
  it("reads a number field as a number and an empty one as zero", () => {
    const fee = fieldFor("membershipFee")!;

    expect(cleanValue(fee, "1500")).toBe(1500);
    expect(cleanValue(fee, "")).toBe(0);
  });

  it("strips everything but digits from a phone", () => {
    expect(cleanValue(fieldFor("supportWhatsapp")!, "+222 22 33 44 55")).toBe("22222334455");
  });

  it("reads a switch as on or off and nothing else", () => {
    const asks = fieldFor("asksBankReference")!;

    expect(cleanValue(asks, "true")).toBe(true);
    expect(cleanValue(asks, "false")).toBe(false);
    expect(cleanValue(asks, "")).toBe(false);
  });
});

describe("what the انتساب form is asked to draw", () => {
  it("switches the two questions the public form asks", () => {
    for (const key of ["asksBankReference", "showsReferenceCode"]) {
      expect(fieldFor(key)?.kind).toBe("switch");
    }
  });

  it("says what stays true when the reference code is not shown", () => {
    expect(fieldFor("showsReferenceCode")?.hint).toBe(settingsForm.showsReferenceCodeHint);
  });
});
