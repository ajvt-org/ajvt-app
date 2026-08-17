"use client";

import BracketTree from "@/components/tournament/BracketTree";
import { getMatchWinnerTeamId } from "@/lib/tournament";
import { useState } from "react";
import type { Group, Match, Team, TournamentFormat } from "./types";
import { matchesState } from "./matchesState";
import MatchCard from "./MatchCard";
import { api, errorMessage } from "@/lib/api";
import ArrowLabel from "@/components/ArrowLabel";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

export default function MatchesTab({
  activityId,
  teams,
  groups,
  format,
  matches,
  onChange,
}: {
  activityId: string;
  teams: Team[];
  groups: Group[];
  format: TournamentFormat;
  matches: Match[];
  onChange: () => void;
}) {
  const [form, setForm] = useState({
    homeTeamId: "",
    awayTeamId: "",
    matchDate: "",
    round: "",
    venue: "",
    isKnockout: false,
  });
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");
  const [resultFormFor, setResultFormFor] = useState<string | null>(null);
  const [cardsFor, setCardsFor] = useState<string | null>(null);
  const [mvpFor, setMvpFor] = useState<string | null>(null);
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generateSchedule() {
    if (
      !confirm(
        "سيتم اقتراح مباريات إضافية تلقائياً بحيث يلعب كل فريق 3 مباريات إجمالاً. يمكنك حذف أو تعديل أي مباراة بعد ذلك. متابعة؟",
      )
    )
      return;
    setGenerating(true);
    setError("");
    try {
      await api.post(`/api/admin/activities/${activityId}/matches/generate`);
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setGenerating(false);
    }
  }

  async function runBracketAction(endpoint: string, confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    setGenerating(true);
    setError("");
    try {
      await api.post(`/api/admin/activities/${activityId}/bracket/${endpoint}`);
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setGenerating(false);
    }
  }

  const {
    bracketMatches,
    finalRound,
    bracketIsFinalDone,
    canAdvanceBracket,
    poolsReady,
    knockoutLocked,
    isTwoGroupFormat,
    groupStageComplete,
  } = matchesState({ format, groups, teams, matches });

  async function moveMatch(list: Match[], index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;
    const a = list[index];
    const b = list[swapIndex];
    setLoadingAction(true);
    try {
      await Promise.all([
        fetch(`/api/admin/matches/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: b.order }),
        }),
        fetch(`/api/admin/matches/${b.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: a.order }),
        }),
      ]);
      onChange();
    } catch {
      alert("خطأ في إعادة الترتيب");
    } finally {
      setLoadingAction(false);
    }
  }

  async function createMatch(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!form.homeTeamId || !form.awayTeamId) {
      setError("يجب اختيار الفريقين");
      return;
    }
    setLoadingAction(true);
    try {
      await api.post(`/api/admin/activities/${activityId}/matches`, form);
      setForm({
        homeTeamId: "",
        awayTeamId: "",
        matchDate: "",
        round: "",
        venue: "",
        isKnockout: false,
      });
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  async function deleteMatch(matchId: string) {
    if (!confirm("هل تريد حذف هذه المباراة؟")) return;
    setLoadingAction(true);
    try {
      await api.del(`/api/admin/matches/${matchId}`);
      onChange();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  const homeTeamForForm = teams.find((t) => t.id === form.homeTeamId);
  const awayTeamOptions = teams.filter((t) => {
    if (t.id === form.homeTeamId) return false;
    if (form.isKnockout) return true;
    if (!homeTeamForForm || homeTeamForForm.groupId === null || t.groupId === null) return true;
    return t.groupId === homeTeamForForm.groupId;
  });

  const scheduled = matches.filter((m) => m.status === "SCHEDULED");
  const played = matches.filter((m) => m.status === "PLAYED");

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="p-3 rounded-xl text-sm font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          ⚠️ {error}
        </div>
      )}

      {poolsReady && (
        <div
          className="card p-4 space-y-2"
          style={{ background: "#d1fae5", border: "1px solid #6ee7b7" }}
        >
          <p className="text-sm font-black" style={{ color: "#065f46" }}>
            ✅ كل المجموعات مكتملة!
          </p>
          <p className="text-xs" style={{ color: "#065f46" }}>
            يمكنك الآن توليد جدول مباريات دور المجموعات (3 مباريات لكل فريق).
          </p>
          <button
            onClick={generateSchedule}
            disabled={generating}
            className="btn btn-primary text-sm"
            style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
          >
            {generating ? "..." : "🎲 توليد جدول مباريات دور المجموعات"}
          </button>
        </div>
      )}

      {groupStageComplete && (
        <div
          className="card p-4 space-y-2"
          style={{ background: "#d1fae5", border: "1px solid #6ee7b7" }}
        >
          <p className="text-sm font-black" style={{ color: "#065f46" }}>
            ✅ انتهى دور المجموعات!
          </p>
          <p className="text-xs" style={{ color: "#065f46" }}>
            كل الفرق لعبت مبارياتها — يمكنك الآن توليد نصف النهائي من ترتيب المجموعتين.
          </p>
          <button
            onClick={() =>
              runBracketAction("semis-from-groups", "توليد نصف النهائي من ترتيب المجموعتين؟")
            }
            disabled={generating}
            className="btn btn-primary text-sm"
            style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
          >
            {generating ? "..." : "⚔️ توليد نصف النهائي"}
          </button>
        </div>
      )}

      {teams.length >= 2 && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            {isTwoGroupFormat
              ? "🏆 نصف النهائي والنهائي"
              : "🏆 القرعة الإقصائية (شطرنج، بلايستيشن، أو أي نظام إقصاء مباشر)"}
          </p>
          {bracketMatches.length === 0 ? (
            knockoutLocked ? (
              <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                <Icon name="lock" size={14} className="icon-inline" /> أكمل جميع نتائج دور المجموعات
                أولاً — ستظهر خيارات الدور الإقصائي هنا بعد انتهاء دور المجموعات.
              </p>
            ) : isTwoGroupFormat ? (
              <>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  نصف نهائي متقاطع من ترتيب المجموعتين (الأول من كل مجموعة أمام الثاني من الأخرى)،
                  ثم النهائي.
                </p>
                <button
                  onClick={() =>
                    runBracketAction("semis-from-groups", "توليد نصف النهائي من ترتيب المجموعتين؟")
                  }
                  disabled={generating}
                  className="btn btn-primary text-sm"
                  style={{ width: "auto" }}
                >
                  ⚔️ توليد نصف النهائي
                </button>
              </>
            ) : (
              <>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  قرعة عشوائية بين كل الفرق/اللاعبين المسجَّلين — يجب أن يكون العدد 4 أو 8 أو 16 أو
                  32...
                </p>
                <button
                  onClick={() =>
                    runBracketAction("draw", "إجراء قرعة عشوائية بين جميع الفرق الحالية؟")
                  }
                  disabled={generating}
                  className="btn btn-primary text-sm"
                  style={{ width: "auto" }}
                >
                  🎲 قرعة عشوائية
                </button>
              </>
            )
          ) : (
            <>
              <BracketTree matches={bracketMatches} />
              {canAdvanceBracket && (
                <button
                  onClick={() =>
                    runBracketAction("next-round", "توليد الدور التالي من نتائج الدور الحالي؟")
                  }
                  disabled={generating}
                  className="btn btn-primary text-sm"
                >
                  <ArrowLabel>توليد الدور التالي</ArrowLabel>
                </button>
              )}
              {bracketIsFinalDone &&
                (() => {
                  const finalMatch = finalRound[0];
                  const winnerId = getMatchWinnerTeamId({
                    ...finalMatch,
                    homeTeamId: finalMatch.homeTeam.id,
                    awayTeamId: finalMatch.awayTeam.id,
                  });
                  const winnerName =
                    winnerId === finalMatch.homeTeam.id
                      ? finalMatch.homeTeam.name
                      : finalMatch.awayTeam.name;
                  return (
                    <p
                      className="text-sm font-black text-center"
                      style={{ color: "var(--mint-700)" }}
                    >
                      🏆 البطل: {winnerName}
                    </p>
                  );
                })()}
            </>
          )}
        </div>
      )}

      {teams.length >= 2 && (
        <button
          onClick={generateSchedule}
          disabled={generating}
          className="btn btn-primary text-sm"
          style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
        >
          {generating ? "..." : "🎲 اقترح جدول المباريات (3 مباريات لكل فريق)"}
        </button>
      )}

      <form onSubmit={createMatch} className="card p-4 space-y-3">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="plus">مباراة جديدة</IconLabel>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.homeTeamId}
            onChange={(e) => setForm((p) => ({ ...p, homeTeamId: e.target.value, awayTeamId: "" }))}
            className="input"
          >
            <option value="">الفريق المضيف...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={form.awayTeamId}
            onChange={(e) => setForm((p) => ({ ...p, awayTeamId: e.target.value }))}
            className="input"
          >
            <option value="">الفريق الضيف...</option>
            {awayTeamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="datetime-local"
            value={form.matchDate}
            onChange={(e) => setForm((p) => ({ ...p, matchDate: e.target.value }))}
            className="input"
          />
          <input
            type="text"
            placeholder="الجولة (اختياري)"
            value={form.round}
            onChange={(e) => setForm((p) => ({ ...p, round: e.target.value }))}
            maxLength={40}
            className="input"
          />
        </div>
        <input
          type="text"
          placeholder="الملعب (اختياري)"
          value={form.venue}
          onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
          maxLength={60}
          className="input"
        />
        <label
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: "var(--text-main)" }}
        >
          <input
            type="checkbox"
            checked={form.isKnockout}
            onChange={(e) =>
              setForm((p) => ({ ...p, isKnockout: e.target.checked, awayTeamId: "" }))
            }
          />
          🏆 مباراة خروج المغلوب (لا تُحتسب في ترتيب المجموعات)
        </label>
        <button type="submit" disabled={loadingAction} className="btn btn-primary text-sm">
          {loadingAction ? "..." : "إضافة المباراة"}
        </button>
      </form>

      {scheduled.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            📅 مباريات قادمة
          </p>
          <div className="space-y-3">
            {scheduled.map((m, i) => (
              <MatchCard
                key={m.id}
                match={m}
                teams={teams}
                allMatches={matches}
                onDelete={() => deleteMatch(m.id)}
                showResultForm={resultFormFor === m.id}
                onToggleResultForm={() => setResultFormFor((v) => (v === m.id ? null : m.id))}
                showCards={cardsFor === m.id}
                onToggleCards={() => setCardsFor((v) => (v === m.id ? null : m.id))}
                showMvp={mvpFor === m.id}
                onToggleMvp={() => setMvpFor((v) => (v === m.id ? null : m.id))}
                showDetails={detailsFor === m.id}
                onToggleDetails={() => setDetailsFor((v) => (v === m.id ? null : m.id))}
                onMoveUp={i > 0 ? () => moveMatch(scheduled, i, "up") : undefined}
                onMoveDown={
                  i < scheduled.length - 1 ? () => moveMatch(scheduled, i, "down") : undefined
                }
                onSaved={() => {
                  setResultFormFor(null);
                  onChange();
                }}
                onChange={onChange}
              />
            ))}
          </div>
        </div>
      )}

      {played.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            ✅ نتائج
          </p>
          <div className="space-y-3">
            {played.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                teams={teams}
                allMatches={matches}
                onDelete={() => deleteMatch(m.id)}
                showResultForm={resultFormFor === m.id}
                onToggleResultForm={() => setResultFormFor((v) => (v === m.id ? null : m.id))}
                showCards={cardsFor === m.id}
                onToggleCards={() => setCardsFor((v) => (v === m.id ? null : m.id))}
                showMvp={mvpFor === m.id}
                onToggleMvp={() => setMvpFor((v) => (v === m.id ? null : m.id))}
                showDetails={detailsFor === m.id}
                onToggleDetails={() => setDetailsFor((v) => (v === m.id ? null : m.id))}
                onSaved={() => {
                  setResultFormFor(null);
                  onChange();
                }}
                onChange={onChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
