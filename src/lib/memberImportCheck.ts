import { validatePhone } from "./utils";
import { validatePaidAmount } from "./donations";
import { isKnownVillage, requiresAgeGroup } from "./villages";
import { members, memberImportRow, villages } from "./messages";
import { paidIsClear, valuesOf, type RowValues } from "./memberImportValues";
import type { ImportColumn, ImportRow } from "./memberImportRow";

const NAME_MAX = 30;

export interface ExistingPerson {
  id: string;
  fullName: string | null;
  phone: string | null;
  village: string;
  age: string | null;
  hasMembership: boolean;
}

export interface RowIssue {
  field: ImportColumn;
  message: string;
  blocking: boolean;
}

export interface RowMatch {
  kind: "phone" | "name";
  personId: string;
  fullName: string | null;
  hasMembership: boolean;
}

export interface CheckedRow {
  row: number;
  values: RowValues;
  issues: RowIssue[];
  match: RowMatch | null;
}

export interface CheckContext {
  villageNames: string[];
  ageGroupNames: string[];
  membershipFee: number;
  paymentMethods: readonly string[];
}

export interface ImportContext extends CheckContext {
  people: ExistingPerson[];
}

function block(field: ImportColumn, message: string): RowIssue {
  return { field, message, blocking: true };
}

function warn(field: ImportColumn, message: string): RowIssue {
  return { field, message, blocking: false };
}

function nameKey(fullName: string, village: string, age: string): string {
  return [fullName.trim(), village.trim(), age.trim()].join("|");
}

function matchOf(kind: RowMatch["kind"], person: ExistingPerson): RowMatch {
  return {
    kind,
    personId: person.id,
    fullName: person.fullName,
    hasMembership: person.hasMembership,
  };
}

function fieldIssues(values: RowValues, context: CheckContext): RowIssue[] {
  const issues: RowIssue[] = [];

  if (!values.fullName) issues.push(block("fullName", members.fullNameRequired));
  else if (values.fullName.length > NAME_MAX)
    issues.push(block("fullName", members.fullNameTooLong));

  if (values.phone) {
    const problem = validatePhone(values.phone);
    if (problem) issues.push(block("phone", problem));
  }

  if (!isKnownVillage(values.village, context.villageNames)) {
    issues.push(block("village", villages.unknownVillage));
  } else if (requiresAgeGroup(values.village)) {
    if (!values.age) issues.push(block("age", members.pickAgeGroup));
    else if (!context.ageGroupNames.includes(values.age))
      issues.push(block("age", memberImportRow.unknownAgeGroup));
  }

  if (values.paid) {
    if (!values.paymentMethod) issues.push(block("paymentMethod", members.pickPaymentMethod));
    else if (!context.paymentMethods.includes(values.paymentMethod))
      issues.push(block("paymentMethod", memberImportRow.paymentMethodUnknown));

    if (values.paidAmount) {
      const problem = validatePaidAmount(values.paidAmount, context.membershipFee);
      if (problem) issues.push(block("paidAmount", problem));
    }
  }

  return issues;
}

export interface ValuedRow {
  row: number;
  values: RowValues;
  match?: RowMatch | null;
}

export function checkValues(rows: ValuedRow[], context: CheckContext): RowIssue[][] {
  const phoneSeen = new Map<string, number>();
  const nameSeen = new Map<string, number>();

  return rows.map(({ row, values, match }) => {
    const issues = fieldIssues(values, context);

    if (values.phone) {
      const earlier = phoneSeen.get(values.phone);
      if (earlier) issues.push(block("phone", memberImportRow.phoneInFileTwice(earlier)));
      else phoneSeen.set(values.phone, row);

      if (match?.kind === "phone")
        issues.push(warn("phone", memberImportRow.phoneOnAnotherAccount));
    }

    if (values.fullName) {
      const key = nameKey(values.fullName, values.village, values.age);
      const earlier = nameSeen.get(key);
      if (earlier) issues.push(warn("fullName", memberImportRow.nameInFileTwice(earlier)));
      else nameSeen.set(key, row);

      if (match?.kind === "name") issues.push(warn("fullName", memberImportRow.nameLooksExisting));
    }

    return issues;
  });
}

export function matchesFor(rows: ValuedRow[], people: ExistingPerson[]): (RowMatch | null)[] {
  const byPhone = new Map(
    people.filter((person) => person.phone).map((person) => [person.phone as string, person]),
  );
  const byName = new Map<string, ExistingPerson>();
  for (const person of people) {
    const key = nameKey(person.fullName ?? "", person.village, person.age ?? "");
    if (!byName.has(key)) byName.set(key, person);
  }

  return rows.map(({ values }) => {
    const owner = values.phone ? byPhone.get(values.phone) : undefined;
    if (owner) return matchOf("phone", owner);

    if (!values.fullName) return null;
    const namesake = byName.get(nameKey(values.fullName, values.village, values.age));
    return namesake ? matchOf("name", namesake) : null;
  });
}

export function checkRows(rows: ImportRow[], context: ImportContext): CheckedRow[] {
  const valued = rows.map(({ row, cells }) => ({ row, values: valuesOf(cells) }));
  const matches = matchesFor(valued, context.people);
  const matched = valued.map((row, at) => ({ ...row, match: matches[at] }));

  return checkValues(matched, context).map((issues, at) => ({
    row: matched[at].row,
    values: matched[at].values,
    issues: paidIsClear(rows[at].cells.paid)
      ? issues
      : [...issues, warn("paid", memberImportRow.paidUnclear)],
    match: matched[at].match,
  }));
}

export function isBlocked(row: CheckedRow): boolean {
  return row.issues.some((issue) => issue.blocking);
}

export function blockedCount(rows: CheckedRow[]): number {
  return rows.filter(isBlocked).length;
}
