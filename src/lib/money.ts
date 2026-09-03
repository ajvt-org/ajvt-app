import { ouguiya } from "./texts/currency";

export const THOUSANDS_SEPARATOR = ".";

export function moneyDigits(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = String(Math.trunc(Math.abs(value)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
}

export function money(value: number): string {
  return `${moneyDigits(value)} ${ouguiya.singular}`;
}
