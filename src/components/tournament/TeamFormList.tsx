import Icon, { type IconName } from "@/components/Icon";
import PagedList from "./PagedList";
import Scoreline from "./Scoreline";

const FORM_STYLE: Record<"W" | "D" | "L", { bg: string; icon: IconName; label: string }> = {
  W: { bg: "#059669", icon: "check", label: "فوز" },
  D: { bg: "var(--text-muted)", icon: "minus", label: "تعادل" },
  L: { bg: "#dc2626", icon: "close", label: "خسارة" },
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
              {team.form.map((result, i) => (
                <span
                  key={i}
                  className="form-pip"
                  role="img"
                  title={FORM_STYLE[result].label}
                  aria-label={FORM_STYLE[result].label}
                  style={{ background: FORM_STYLE[result].bg, color: "#fff" }}
                >
                  <Icon name={FORM_STYLE[result].icon} size={11} />
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </PagedList>
  );
}
