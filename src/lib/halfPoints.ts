import { HALVES_PER_PART } from "./matchSeries";

const HALF = "½";
const MINUS = "−";

export function halvesText(halves: number): string {
  const size = Math.abs(halves);
  const whole = Math.trunc(size / HALVES_PER_PART);
  const half = size % HALVES_PER_PART === 1;
  const digits = half ? (whole === 0 ? HALF : `${whole}${HALF}`) : String(whole);
  return halves < 0 ? `${MINUS}${digits}` : digits;
}
