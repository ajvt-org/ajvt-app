export const giftSourceLabels: Record<string, string> = {
  PUBLIC: "عام",
  SELF: "من حساب",
  MEMBERSHIP: "انتساب",
  UNRECORDED: "غير مسجل",
};

export function giftSourceLabel(value: string): string {
  return giftSourceLabels[value] ?? value;
}
