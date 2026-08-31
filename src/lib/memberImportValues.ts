import { HOME_VILLAGE, requiresAgeGroup } from "./villages";
import { memberImport } from "./texts";
import type { ImportCells } from "./memberImportRow";

const TRUE_WORDS: readonly string[] = memberImport.paidYes;
const FALSE_WORDS: readonly string[] = memberImport.paidNo;

export interface RowValues {
  fullName: string;
  phone: string;
  village: string;
  age: string;
  paid: boolean;
  paymentMethod: string;
  paidAmount: string;
}

export function readPaid(cell: string): boolean {
  return TRUE_WORDS.includes(cell.trim().toLowerCase());
}

export function paidIsClear(cell: string): boolean {
  const value = cell.trim().toLowerCase();
  return TRUE_WORDS.includes(value) || FALSE_WORDS.includes(value);
}

export function readPhone(cell: string): string {
  return cell.replace(/\D/g, "");
}

export function valuesOf(cells: ImportCells): RowValues {
  const village = cells.village.trim() || HOME_VILLAGE;
  return {
    fullName: cells.fullName.trim(),
    phone: readPhone(cells.phone),
    village,
    age: requiresAgeGroup(village) ? cells.age.trim() : "",
    paid: readPaid(cells.paid),
    paymentMethod: cells.paymentMethod.trim(),
    paidAmount: cells.paidAmount.replace(/\s/g, ""),
  };
}
