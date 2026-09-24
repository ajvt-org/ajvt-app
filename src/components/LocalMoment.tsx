import { localMoment } from "@/lib/localDateInput";

export default function LocalMoment({ at }: { at: string | Date }) {
  const { date, time } = localMoment(at);
  return (
    <span className="whitespace-nowrap">
      <bdi dir="ltr">{date}</bdi> <bdi dir="ltr">{time}</bdi>
    </span>
  );
}
