// Arabic counts a noun in four shapes, not two: one, a pair, a few (3 to 10),
// and many (11 and up). "1 ساعة" is what a naive template produces and what a
// reader notices immediately.
export function hoursLabel(hours: number): string {
  if (hours === 1) return "ساعة واحدة";
  if (hours === 2) return "ساعتين";
  if (hours >= 3 && hours <= 10) return `${hours} ساعات`;
  return `${hours} ساعة`;
}
