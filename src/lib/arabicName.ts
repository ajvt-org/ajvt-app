export function isArabicName(value: string): boolean {
  return /^[؀-ۿ\s]+$/.test(value.trim());
}
