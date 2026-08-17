import { FIRST_NAMES, LAST_NAMES, REFERENCE_ALPHABET } from "./data";

let seq = 0;

export function next(): number {
  seq += 1;
  return seq;
}

export function pick<T>(list: T[], i: number): T {
  return list[i % list.length];
}

export function fullName(i: number): string {
  return `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, Math.floor(i / 3))}`;
}

export function phone(i: number): string {
  const prefix = ["2", "3", "4"][i % 3];
  return prefix + String(1000000 + i * 7919).slice(0, 7);
}

export function referenceCode(i: number): string {
  let code = "";
  let n = i * 104729 + 7;
  for (let k = 0; k < 5; k++) {
    code += REFERENCE_ALPHABET[n % REFERENCE_ALPHABET.length];
    n = Math.floor(n / REFERENCE_ALPHABET.length) + 31 * (k + 1);
  }
  return `AJ-${code}`;
}

export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 1000);
}
