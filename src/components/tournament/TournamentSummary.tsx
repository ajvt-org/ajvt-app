export default function TournamentSummary({
  matchesPlayed,
  totalGoals,
  avgGoalsPerMatch,
  bestAttack,
}: {
  matchesPlayed: number;
  totalGoals: number;
  avgGoalsPerMatch: number;
  bestAttack: { name: string; gf: number } | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatBox label="مباريات لُعبت" value={matchesPlayed} />
      <StatBox label="مجموع الأهداف" value={totalGoals} />
      <StatBox label="معدل الأهداف/مباراة" value={avgGoalsPerMatch} />
      <StatBox
        label="أفضل هجوم"
        value={
          bestAttack ? (
            <>
              <bdi>{bestAttack.name}</bdi> <bdi>({bestAttack.gf})</bdi>
            </>
          ) : (
            "\u2014"
          )
        }
      />
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-lg font-black" style={{ color: "var(--mint-700)" }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
    </div>
  );
}
