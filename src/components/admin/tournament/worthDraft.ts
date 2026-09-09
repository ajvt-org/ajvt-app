import { worthRuleProblem, type WorthProblem, type WorthWhen } from "@/lib/unitWorth";

export interface WorthRuleRow {
  id: string;
  name: string;
  levelId: string;
  when: WorthWhen[];
  worth: number;
}

export interface WorthDraft {
  key: string;
  id: string | null;
  levelKey: string;
  name: string;
  when: WorthWhen[];
  worth: string;
}

export function blankWorth(key: string, levelKey: string): WorthDraft {
  return { key, id: null, levelKey, name: "", when: ["LOSER_ON_NOTHING"], worth: "2" };
}

export function draftOfWorth(rule: WorthRuleRow): WorthDraft {
  return {
    key: rule.id,
    id: rule.id,
    levelKey: rule.levelId,
    name: rule.name,
    when: rule.when,
    worth: String(rule.worth),
  };
}

export function worthPayload(draft: WorthDraft) {
  return {
    id: draft.id,
    levelKey: draft.levelKey,
    name: draft.name.trim(),
    when: draft.when,
    worth: Number(draft.worth || 0),
  };
}

export function worthFaults(drafts: WorthDraft[], keys: string[]): (WorthProblem | null)[] {
  const declared = new Set(keys);
  return drafts.map((draft) =>
    worthRuleProblem({
      name: draft.name,
      levelId: declared.has(draft.levelKey) ? draft.levelKey : "",
      when: draft.when,
      worth: Number(draft.worth || 0),
    }),
  );
}
