const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LENGTH = 5;

export const REFERENCE_CODE_PATTERN = new RegExp(`^AJ-[${ALPHABET}]{${LENGTH}}$`);

export function generateReferenceCode(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `AJ-${code}`;
}

export function isValidReferenceCode(value: unknown): value is string {
  return typeof value === "string" && REFERENCE_CODE_PATTERN.test(value);
}
