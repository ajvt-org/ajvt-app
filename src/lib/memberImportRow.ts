export const IMPORT_COLUMNS = [
  "fullName",
  "phone",
  "village",
  "age",
  "paymentMethod",
  "paidAmount",
  "paid",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export type ImportCells = Record<ImportColumn, string>;

export interface ImportRow {
  row: number;
  cells: ImportCells;
}

export function emptyCells(): ImportCells {
  return {
    fullName: "",
    phone: "",
    village: "",
    age: "",
    paymentMethod: "",
    paidAmount: "",
    paid: "",
  };
}
