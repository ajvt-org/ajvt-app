import { describe, it, expect } from "vitest";
import { notify } from "./notify";

const ASSOCIATION = /التاكلالت/;

describe("every push payload", () => {
  const samples = [
    notify.quizDayOpen(),
    notify.matchScheduled("الهلال", "النصر", "act1"),
    notify.matchReminder("الهلال", "النصر", "act1"),
    notify.matchResult("الهلال", 2, 1, "النصر", "act1"),
    notify.mvpVoteOpen("الهلال", "النصر", "act1"),
    notify.membershipDecision(true),
    notify.membershipDecision(false),
    notify.registrationDecision(true, "رحلة"),
    notify.registrationDecision(false, "رحلة"),
  ];

  it("never repeats the association name the system already shows", () => {
    for (const p of samples) {
      expect(p.title).not.toMatch(ASSOCIATION);
      expect(p.body).not.toMatch(ASSOCIATION);
    }
  });

  it("never repeats a title word in its body", () => {
    for (const p of samples) {
      for (const word of p.title.split(" ").filter((w) => w.length > 2)) {
        expect(p.body.split(" ")).not.toContain(word);
      }
    }
  });

  it("shows no تم construction anywhere", () => {
    for (const p of samples) {
      expect(`${p.title} ${p.body}`).not.toMatch(/\bتم\b|\bيتم\b/);
    }
  });
});

describe("a match payload", () => {
  it("carries the pairing and points at the tournament", () => {
    const p = notify.matchReminder("الهلال", "النصر", "act1");
    expect(p.body).toBe("«الهلال» × «النصر»");
    expect(p.url).toBe("/tournament/act1");
  });

  it("carries the score between the names", () => {
    expect(notify.matchResult("الهلال", 2, 1, "النصر", "act1").body).toBe("«الهلال» 2 – 1 «النصر»");
  });
});

describe("a decision payload", () => {
  it("celebrates acceptance in the title", () => {
    expect(notify.membershipDecision(true).title).toBe("قُبِلَت عضويتك");
    expect(notify.registrationDecision(true, "رحلة").title).toBe("قُبِلَ تسجيلك");
  });

  it("keeps a refusal behind a neutral title", () => {
    expect(notify.membershipDecision(false).title).toBe("قرار العضوية");
    expect(notify.registrationDecision(false, "رحلة").title).toBe("قرار التسجيل");
  });

  it("appends a trimmed refusal reason and drops a blank one", () => {
    expect(notify.registrationDecision(false, "رحلة", " اكتمل العدد ").body).toBe(
      "نأسف، لم يُقبَل تسجيلك في «رحلة»، اكتمل العدد",
    );
    expect(notify.registrationDecision(false, "رحلة", "  ").body).toBe(
      "نأسف، لم يُقبَل تسجيلك في «رحلة»",
    );
  });

  it("names the activity the member got into", () => {
    expect(notify.registrationDecision(true, "رحلة").body).toBe("مكانك محجوز في «رحلة»");
  });
});
