import { dayLabel } from "./daysTypes";

export default function DayHeading({
  position,
  date,
  isRest,
}: {
  position: number;
  date: string | null;
  isRest: boolean;
}) {
  const label = dayLabel(date);

  return (
    <span className="min-w-0 grow basis-48 flex items-center gap-2">
      <span
        className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-base"
        style={
          isRest
            ? { background: "#fef3c7", color: "#b45309" }
            : { background: "var(--mint-100)", color: "var(--mint-700)" }
        }
      >
        <span className="badge-numeral font-black tabular-nums">{position}</span>
      </span>
      {label && (
        <span className="min-w-0 block text-sm font-black" style={{ color: "var(--text-main)" }}>
          {label}
        </span>
      )}
    </span>
  );
}
