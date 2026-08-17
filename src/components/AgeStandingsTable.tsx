import type { AgeStanding } from "@/lib/ageStandings";

const MEDALS = ["#d4af37", "#9aa3ab", "#c07a3e"];

function Row({ entry, mine }: { entry: AgeStanding; mine: boolean }) {
  const medal = MEDALS[entry.rank - 1];

  return (
    <div
      className="card p-4 space-y-2.5"
      style={
        mine ? { background: "var(--mint-50)", border: "1.5px solid var(--mint-500)" } : undefined
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-black"
            style={{
              background: medal ?? "var(--mint-100)",
              color: medal ? "#fff" : "var(--mint-700)",
            }}
          >
            <span className="badge-numeral">{entry.rank}</span>
          </span>
          <p className="font-bold truncate" style={{ color: "var(--text-main)" }}>
            {entry.name}
            {mine && (
              <span
                className="expense-tag mr-1.5"
                style={{ background: "var(--mint-600)", color: "white" }}
              >
                عصرك
              </span>
            )}
          </p>
        </div>
        <span className="font-black shrink-0" style={{ color: "var(--mint-700)" }}>
          {entry.members} / {entry.total}
        </span>
      </div>

      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "var(--mint-100)" }}
        role="img"
        aria-label={`نسبة الانتساب ${entry.rate}٪`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${entry.rate}%`, background: "var(--mint-600)" }}
        />
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        نسبة الانتساب {entry.rate}٪
      </p>
    </div>
  );
}

export default function AgeStandingsTable({
  standings,
  mine,
}: {
  standings: AgeStanding[];
  mine?: string | null;
}) {
  return (
    <div className="space-y-3">
      {standings.map((entry) => (
        <Row key={entry.name} entry={entry} mine={!!mine && entry.name === mine} />
      ))}
    </div>
  );
}
