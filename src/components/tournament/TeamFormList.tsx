const FORM_STYLE: Record<"W" | "D" | "L", { bg: string; color: string }> = {
  W: { bg: "#d1fae5", color: "#065f46" },
  D: { bg: "var(--mint-100)", color: "var(--text-muted)" },
  L: { bg: "#fee2e2", color: "#991b1b" },
};

type TeamStats = {
  teamId: string;
  name: string;
  biggestWin: { score: string; opponent: string } | null;
  unbeatenStreak: number;
  form: ("W" | "D" | "L")[];
};

export default function TeamFormList({ teams }: { teams: TeamStats[] }) {
  return (
    <div className="space-y-2">
      {teams.map((team) => (
        <div key={team.teamId} className="card p-3 space-y-1">
          <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
            {team.name}
          </p>
          {team.biggestWin && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              أكبر فوز: <span dir="ltr">{team.biggestWin.score}</span> أمام{" "}
              {team.biggestWin.opponent}
            </p>
          )}
          {team.unbeatenStreak > 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              سلسلة بدون هزيمة: {team.unbeatenStreak}
            </p>
          )}
          {team.form.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                آخر {team.form.length} مباريات:
              </span>
              {team.form.map((result, i) => (
                <span
                  key={i}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ background: FORM_STYLE[result].bg, color: FORM_STYLE[result].color }}
                >
                  {result}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
