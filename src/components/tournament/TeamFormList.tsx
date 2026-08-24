import PagedList from "./PagedList";
import Scoreline from "./Scoreline";
import { counted } from "@/lib/arabicCount";
import { MATCH } from "@/lib/messages";

const FORM_STYLE: Record<
  "W" | "D" | "L",
  { bg: string; color: string; letter: string; label: string }
> = {
  W: { bg: "#059669", color: "#fff", letter: "ف", label: "فوز" },
  D: { bg: "var(--mint-300)", color: "var(--text-main)", letter: "ت", label: "تعادل" },
  L: { bg: "#dc2626", color: "#fff", letter: "خ", label: "خسارة" },
};

type TeamStats = {
  teamId: string;
  name: string;
  biggestWin: { gf: number; ga: number; opponent: string } | null;
  unbeatenStreak: number;
  form: ("W" | "D" | "L")[];
};

export default function TeamFormList({ teams }: { teams: TeamStats[] }) {
  return (
    <PagedList>
      {teams.map((team) => (
        <div key={team.teamId} className="card p-3 space-y-1">
          <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
            {team.name}
          </p>
          {team.biggestWin && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              أكبر فوز: <Scoreline home={team.biggestWin.gf} away={team.biggestWin.ga} /> أمام{" "}
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
                آخر {counted(team.form.length, MATCH)}:
              </span>
              {team.form.map((result, i) => (
                <span
                  key={i}
                  className="form-pip"
                  title={FORM_STYLE[result].label}
                  aria-label={FORM_STYLE[result].label}
                  style={{ background: FORM_STYLE[result].bg, color: FORM_STYLE[result].color }}
                >
                  {FORM_STYLE[result].letter}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </PagedList>
  );
}
