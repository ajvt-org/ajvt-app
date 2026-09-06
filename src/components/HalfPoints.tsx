import { halvesText } from "@/lib/halfPoints";

export default function HalfPoints({ halves }: { halves: number }) {
  return (
    <bdi dir="ltr" className="tabular-nums">
      {halvesText(halves)}
    </bdi>
  );
}
