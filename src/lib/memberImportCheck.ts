import { validatePhone } from "./utils";
import { validatePaidAmount } from "./donations";
import { isKnownVillage, requiresAgeGroup } from "./villages";
import { members, memberImportRow, villages } from "./messages";
import { valuesOf, type RowValues } from "./memberImportValues";
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

export interface ImportContext {
  people: ExistingPerson[];
  villageNames: string[];
  ageGroupNames: string[];
  membershipFee: number;
  paymentMethods: readonly string[];
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

function fieldIssues(values: RowValues, context: ImportContext): RowIssue[] {
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

export function checkRows(rows: ImportRow[], context: ImportContext): CheckedRow[] {
  const byPhone = new Map(
    context.people
      .filter((person) => person.phone)
      .map((person) => [person.phone as string, person]),
  );
  const byName = new Map<string, ExistingPerson>();
  for (const person of context.people) {
    const key = nameKey(person.fullName ?? "", person.village, person.age ?? "");
    if (!byName.has(key)) byName.set(key, person);
  }

  const phoneSeen = new Map<string, number>();
  const nameSeen = new Map<string, number>();

  return rows.map(({ row, cells }) => {
    const values = valuesOf(cells);
    const issues = fieldIssues(values, context);
    let match: RowMatch | null = null;

    if (values.phone) {
      const earlier = phoneSeen.get(values.phone);
      if (earlier) issues.push(block("phone", memberImportRow.phoneInFileTwice(earlier)));
      else phoneSeen.set(values.phone, row);

      const owner = byPhone.get(values.phone);
      if (owner) {
        match = matchOf("phone", owner);
        issues.push(warn("phone", memberImportRow.phoneOnAnotherAccount));
      }
    }

    if (values.fullName) {
      const key = nameKey(values.fullName, values.village, values.age);
      const earlier = nameSeen.get(key);
      if (earlier) issues.push(warn("fullName", memberImportRow.nameInFileTwice(earlier)));
      else nameSeen.set(key, row);

      const namesake = byName.get(key);
      if (namesake && !match) {
        match = matchOf("name", namesake);
        issues.push(warn("fullName", memberImportRow.nameLooksExisting));
      }
    }

    if (values.paid && match?.hasMembership) {
      issues.push(warn("paid", memberImportRow.alreadyHasMembership));
    }

    return { row, values, issues, match };
  });
}

export function isBlocked(row: CheckedRow): boolean {
  return row.issues.some((issue) => issue.blocking);
}

export function blockedCount(rows: CheckedRow[]): number {
  return rows.filter(isBlocked).length;
}
