import type { EntrantKind } from "../entrant";

function squadRange(min: number | null, max: number | null): string {
  if (min !== null && max !== null && min !== max) return `${min} إلى ${max}`;
  return String(min ?? max ?? 0);
}

export interface EntrantWording {
  entrantNameRequired: string;
  entrantNameTooLong: string;
  entrantFull: (max: number | null) => string;
  captainNotInEntrant: string;
  memberAlreadyEntered: (name: string) => string;
  entrantChoiceLocked: string;
  setupNeedsTwoEntrants: string;
  targetEntrantsRange: string;
  entrantsIncomplete: (min: number | null, max: number | null, names: string) => string;
  everyEntrantInOneGroup: string;
  groupNeedsTwoEntrants: string;
  drawGroupsImpossible: string;
  squadSizeLocked: string;
  entrantAgainstItself: string;
  bothEntrantsRequired: string;
  entrantsNotInTournament: string;
  entrantNotSetYet: string;
  fixtureHasNoEntrants: string;
  fixtureNeedsBothEntrants: string;
  forfeitWinnerNotInMatch: string;
}

const TEAM_WORDING: EntrantWording = {
  entrantNameRequired: "اسم الفريق مطلوب",
  entrantNameTooLong: "اسم الفريق طويل جداً (40 حرفاً كحد أقصى)",
  entrantFull: (max: number | null) => `هذا الفريق مكتمل — الحد الأقصى ${max} لاعبين`,
  captainNotInEntrant: "القائد يجب أن يكون أحد لاعبي الفريق",
  memberAlreadyEntered: (name: string) => `هذا العضو منضم بالفعل إلى فريق «${name}» في هذه البطولة`,
  entrantChoiceLocked: "لقد تم تأكيد اختيارك للفريق، لا يمكن تغييره",
  setupNeedsTwoEntrants: "يحتاج النشاط إلى فريقين على الأقل",
  targetEntrantsRange: "عدد الفرق المستهدف يجب أن يكون بين 2 و64",
  entrantsIncomplete: (min: number | null, max: number | null, names: string) =>
    `فرق غير مكتملة (${squadRange(min, max)} لاعبين لكل فريق): ${names} — أكملها قبل القرعة`,
  everyEntrantInOneGroup: "كل فريق يجب أن يكون في مجموعة واحدة",
  groupNeedsTwoEntrants: "كل مجموعة تحتاج فريقين على الأقل",
  drawGroupsImpossible:
    "توزيع المجموعات لا يسمح بقرعة تتجنّب لقاء فريقين من مجموعة واحدة — عدّل المجموعات ثم أعد القرعة",
  squadSizeLocked: "لا يمكن تغيير حجم الفريق بعد انطلاق البطولة",
  entrantAgainstItself: "لا يمكن أن يلعب الفريق ضد نفسه",
  bothEntrantsRequired: "يجب اختيار الفريقين",
  entrantsNotInTournament: "الفريقان يجب أن ينتميا إلى هذه البطولة",
  entrantNotSetYet: "فريق لم يُحدد بعد",
  fixtureHasNoEntrants: "لم يُحدد فريقا هذه المباراة بعد",
  fixtureNeedsBothEntrants: "المباراة تحتاج فريقين",
  forfeitWinnerNotInMatch: "الفريق الفائز بالانسحاب ليس من فريقي المباراة",
};

const PLAYER_WORDING: EntrantWording = {
  entrantNameRequired: "اسم اللاعب مطلوب",
  entrantNameTooLong: "اسم اللاعب طويل جداً (40 حرفاً كحد أقصى)",
  entrantFull: () => "هذه بطولة فردية، لا يُضاف لاعب ثانٍ إلى مشارك",
  captainNotInEntrant: "القائد يجب أن يكون اللاعب نفسه",
  memberAlreadyEntered: () => "هذا العضو مشارك بالفعل في هذه البطولة",
  entrantChoiceLocked: "لقد تم تأكيد مشاركتك، لا يمكن تغييرها",
  setupNeedsTwoEntrants: "يحتاج النشاط إلى لاعبين اثنين على الأقل",
  targetEntrantsRange: "عدد اللاعبين المستهدف يجب أن يكون بين 2 و64",
  entrantsIncomplete: (_min: number | null, _max: number | null, names: string) =>
    `مشاركون بلا لاعب: ${names} — أكملهم قبل القرعة`,
  everyEntrantInOneGroup: "كل لاعب يجب أن يكون في مجموعة واحدة",
  groupNeedsTwoEntrants: "كل مجموعة تحتاج لاعبين اثنين على الأقل",
  drawGroupsImpossible:
    "توزيع المجموعات لا يسمح بقرعة تتجنّب لقاء لاعبين من مجموعة واحدة — عدّل المجموعات ثم أعد القرعة",
  squadSizeLocked: "لا يمكن تغيير عدد اللاعبين لكل مشارك بعد انطلاق البطولة",
  entrantAgainstItself: "لا يمكن أن يلعب اللاعب ضد نفسه",
  bothEntrantsRequired: "يجب اختيار اللاعبين",
  entrantsNotInTournament: "اللاعبان يجب أن ينتميا إلى هذه البطولة",
  entrantNotSetYet: "لاعب لم يُحدد بعد",
  fixtureHasNoEntrants: "لم يُحدد لاعبا هذه المباراة بعد",
  fixtureNeedsBothEntrants: "المباراة تحتاج لاعبين",
  forfeitWinnerNotInMatch: "اللاعب الفائز بالانسحاب ليس من لاعبي المباراة",
};

export function entrantWording(entrant: EntrantKind): EntrantWording {
  return entrant === "player" ? PLAYER_WORDING : TEAM_WORDING;
}
