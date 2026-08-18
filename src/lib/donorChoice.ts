import { money } from "./messages/money";

export const DONOR_NAME_MAX = 50;

export function validateDonorChoice(anonymous: boolean | null, name: string): string | null {
  if (anonymous === null) return money.nameChoiceRequired;
  if (anonymous) return null;
  const trimmed = name.trim();
  if (!trimmed) return money.nameRequired;
  if (trimmed.length > DONOR_NAME_MAX) return money.nameTooLong;
  return null;
}

export function donorNameFor(anonymous: boolean, name: string): string | null {
  return anonymous ? null : name.trim() || null;
}
