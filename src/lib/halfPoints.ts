export const HALVES_IN_A_WHOLE = 2;

const HALF = "½";
const MINUS = "−";

export function halvesText(halves: number, perUnit: number = HALVES_IN_A_WHOLE): string {
  const size = Math.abs(halves);
  const step = perUnit > 0 ? perUnit : 1;
  const whole = Math.trunc(size / step);
  const half = size % step === step / HALVES_IN_A_WHOLE;
  const digits = half ? (whole === 0 ? HALF : `${whole}${HALF}`) : String(whole);
  return halves < 0 ? `${MINUS}${digits}` : digits;
}
