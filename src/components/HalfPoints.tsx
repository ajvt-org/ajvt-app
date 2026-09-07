import { halvesText, HALVES_IN_A_WHOLE } from "@/lib/halfPoints";

export default function HalfPoints({
  halves,
  perUnit = HALVES_IN_A_WHOLE,
}: {
  halves: number;
  perUnit?: number;
}) {
  return (
    <bdi dir="ltr" className="tabular-nums">
      {halvesText(halves, perUnit)}
    </bdi>
  );
}
