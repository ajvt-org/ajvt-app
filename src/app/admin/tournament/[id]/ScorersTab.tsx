"use client";

import {
  type TopScorerRow,
  type DisciplineRow,
  type CleanSheetRow,
  type MotmRow,
  type TeamAdvancedRow,
} from "@/lib/tournament";
import { RankBadge } from "./StandingsTab";
import { FORM_STYLE } from "./constants";

export default function ScorersTab({
  topScorers,
  discipline,
  cleanSheets,
  motmLeaders,
  teamAdvancedStats,
}: {
  topScorers: TopScorerRow[];
  discipline: DisciplineRow[];
  cleanSheets: CleanSheetRow[];
  motmLeaders: MotmRow[];
  teamAdvancedStats: TeamAdvancedRow[];
}) {
  const teamsWithStats = teamAdvancedStats.filter((t) => t.biggestWin || t.form.length > 0);
  const noData =
    topScorers.length === 0 &&
    discipline.length === 0 &&
    cleanSheets.length === 0 &&
    motmLeaders.length === 0 &&
    teamsWithStats.length === 0;

  if (noData) {
    return (
      <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
        لا توجد إحصائيات مسجلة بعد
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-sm font-black" style={{ color: "var(--text-main)" }}>
          ⚽ الهدافون
        </h3>
        {topScorers.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لا توجد أهداف مسجلة بعد
          </p>
        ) : (
          topScorers.slice(0, 15).map((s, i) => (
            <div key={s.memberId} className="card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <RankBadge i={i} />
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                    {s.fullName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {s.teamName}
                  </p>
                </div>
              </div>
              <span className="font-black" style={{ color: "var(--mint-700)" }}>
                ⚽ {s.goals}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-black" style={{ color: "var(--text-main)" }}>
          🟨🟥 الانضباط
        </h3>
        {discipline.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لا توجد بطاقات مسجلة بعد
          </p>
        ) : (
          discipline.slice(0, 15).map((d, i) => (
            <div key={d.memberId} className="card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <RankBadge i={i} />
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                    {d.fullName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {d.teamName}
                  </p>
                </div>
              </div>
              <span className="font-black text-sm" style={{ color: "var(--text-main)" }}>
                {d.yellow > 0 && `🟨${d.yellow}`} {d.red > 0 && `🟥${d.red}`}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-black" style={{ color: "var(--text-main)" }}>
          🧤 أفضل دفاع (مباريات بدون استقبال أهداف)
        </h3>
        {cleanSheets.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لا توجد بيانات كافية بعد
          </p>
        ) : (
          cleanSheets.slice(0, 10).map((c, i) => (
            <div key={c.teamId} className="card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <RankBadge i={i} />
                <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                  {c.name}
                </p>
              </div>
              <span className="font-black" style={{ color: "var(--mint-700)" }}>
                🧤 {c.cleanSheets}/{c.played}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-black" style={{ color: "var(--text-main)" }}>
          🌟 رجل المباراة
        </h3>
        {motmLeaders.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لم يتم تحديد رجل مباراة بعد
          </p>
        ) : (
          motmLeaders.slice(0, 10).map((m, i) => (
            <div key={m.memberId} className="card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <RankBadge i={i} />
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                    {m.fullName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {m.teamName}
                  </p>
                </div>
              </div>
              <span className="font-black" style={{ color: "var(--mint-700)" }}>
                🌟 {m.count}
              </span>
            </div>
          ))
        )}
      </div>

      {teamsWithStats.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-black" style={{ color: "var(--text-main)" }}>
            📊 إحصائيات الفرق
          </h3>
          {teamsWithStats.map((t) => (
            <div key={t.teamId} className="card p-3 space-y-1">
              <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                {t.name}
              </p>
              {t.biggestWin && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  🔥 أكبر فوز: {t.biggestWin.score} أمام {t.biggestWin.opponent}
                </p>
              )}
              {t.unbeatenStreak > 0 && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  🛡️ سلسلة بدون هزيمة: {t.unbeatenStreak}
                </p>
              )}
              {t.form.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    آخر {t.form.length} مباريات:
                  </span>
                  {t.form.map((f, i) => (
                    <span
                      key={i}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                      style={{ background: FORM_STYLE[f].bg, color: FORM_STYLE[f].color }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
