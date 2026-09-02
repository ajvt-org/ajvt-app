import { receiptPurpose } from "./texts/receipt";

export type ReceiptState = "ACTIVE" | "VOID";

export interface OfficialReceiptView {
  number: string;
  token?: string;
  payerName: string;
  reason: string;
  amount: number;
  issuedOn: string;
  secretary: string | null;
  treasurer: string | null;
  status: ReceiptState;
}

export const RECEIPT_NUMBER_PREFIX = "R";

export function receiptNumber(year: number, sequence: number): string {
  return `${RECEIPT_NUMBER_PREFIX}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function isReceiptNumber(value: string): boolean {
  return new RegExp(`^${RECEIPT_NUMBER_PREFIX}-\\d{4}-\\d{4,}$`).test(value);
}

export function receiptDate(date: Date | string): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())} / ${pad(d.getMonth() + 1)} / ${d.getFullYear()}`;
}

export function receiptFileName(number: string, extension: string): string {
  return receiptPurpose.fileName(number, extension);
}

export function verifyPath(token: string): string {
  return `/receipt/${token}`;
}
