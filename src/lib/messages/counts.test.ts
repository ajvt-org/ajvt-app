import { describe, it, expect } from "vitest";
import { counted } from "@/lib/arabicCount";
import {
  ACTIVE_MEMBER,
  CORRECT_ANSWER,
  HOUR,
  JOIN_REQUEST,
  PENDING_INVITATION,
  QUESTION,
  ROUND,
  SECOND,
} from "@/lib/messages/counts";

describe("the nouns the quiz screens count", () => {
  it("gives none the plural rather than the singular", () => {
    expect(counted(0, QUESTION)).toBe("0 أسئلة");
    expect(counted(0, ROUND)).toBe("0 جولات");
    expect(counted(0, CORRECT_ANSWER)).toBe("0 إجابات صحيحة");
  });

  it("names one and two rather than counting them", () => {
    expect(counted(1, QUESTION)).toBe("سؤال");
    expect(counted(2, QUESTION)).toBe("سؤالان");
    expect(counted(2, SECOND)).toBe("ثانيتان");
    expect(counted(2, HOUR)).toBe("ساعتان");
  });

  it("keeps the number from three up", () => {
    expect(counted(3, QUESTION)).toBe("3 أسئلة");
    expect(counted(11, QUESTION)).toBe("11 سؤالاً");
    expect(counted(100, QUESTION)).toBe("100 سؤال");
  });

  it("carries the tanween on the many form", () => {
    expect(counted(11, ROUND)).toBe("11 جولةً");
    expect(counted(11, SECOND)).toBe("11 ثانيةً");
    expect(counted(11, HOUR)).toBe("11 ساعةً");
    expect(counted(11, PENDING_INVITATION)).toBe("11 دعوةً لم يُرد عليها");
  });

  it("binds the adjective to the noun in every shape", () => {
    expect(counted(1, CORRECT_ANSWER)).toBe("إجابة صحيحة");
    expect(counted(2, CORRECT_ANSWER)).toBe("إجابتان صحيحتان");
    expect(counted(3, CORRECT_ANSWER)).toBe("3 إجابات صحيحة");
    expect(counted(11, CORRECT_ANSWER)).toBe("11 إجابةً صحيحةً");
  });

  it("leaves a first term of an idafa without tanween", () => {
    expect(counted(2, JOIN_REQUEST)).toBe("طلبا انضمام");
    expect(counted(11, JOIN_REQUEST)).toBe("11 طلب انضمام");
  });

  it("puts two active members in the nominative like every other noun here", () => {
    expect(counted(2, ACTIVE_MEMBER)).toBe("عضوان نشطان");
  });
});
