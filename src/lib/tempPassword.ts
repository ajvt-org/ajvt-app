import { randomInt } from "crypto";

export const TEMP_PASSWORD_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const TEMP_PASSWORD_LENGTH = 10;

export function generateTempPassword(): string {
  let password = "";
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    password += TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)];
  }
  return password;
}

export function isTempPasswordActive(
  expiresAt: Date | null | undefined,
  now = new Date(),
): boolean {
  return expiresAt != null && expiresAt > now;
}

export function isTempPasswordExpired(
  expiresAt: Date | null | undefined,
  now = new Date(),
): boolean {
  return expiresAt != null && expiresAt <= now;
}

export function tempPasswordExpiry(hours: number, now = new Date()): Date {
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}
