"use client";

import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import TeamLogo from "@/components/tournament/TeamLogo";
import { getHeadToHead, formatMatchDateTime } from "@/lib/tournament";
import type { Match, Team } from "./types";
import BookingsForm from "./BookingsForm";
import MatchDetailsForm from "./MatchDetailsForm";
import MvpVoteAdmin from "./MvpVoteAdmin";
import ResultForm from "./ResultForm";
import { CARD_LABEL } from "./constants";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

export default function MatchCard({
  match,
  teams,
  allMatches,
  onDelete,
  showResultForm,
  onToggleResultForm,
  showCards,
  onToggleCards,
  showMvp,
  onToggleMvp,
  showDetails,
  onToggleDetails,
  onMoveUp,
  onMoveDown,
  onSaved,
  onChange,
}: {
  match: Match;
  teams: Team[];
  allMatches: Match[];
  onDelete: () => void;
  showResultForm: boolean;
  onToggleResultForm: () => void;
  showCards: boolean;
  onToggleCards: () => void;
  showMvp: boolean;
  onToggleMvp: () => void;
  showDetails: boolean;
  onToggleDetails: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSaved: () => void;
  onChange: () => void;
}) {
  const priorMeetings = getHeadToHead(allMatches, match.homeTeam.id, match.awayTeam.id, match.id);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            className="font-bold text-sm flex items-center gap-1.5 flex-wrap"
            style={{ color: "var(--text-main)" }}
          >
            <TeamLogo logo={match.homeTeam.logo} name={match.homeTeam.name} size={20} />
            {match.homeTeam.name}
            {match.status === "PLAYED" ? ` ${match.homeScore} - ${match.awayScore} ` : " × "}
            {match.awayTeam.name}
            <TeamLogo logo={match.awayTeam.logo} name={match.awayTeam.name} size={20} />
            {match.homePenalties !== null && match.awayPenalties !== null && (
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                {" "}
                (ركلات ترجيح {match.homePenalties}-{match.awayPenalties})
              </span>
            )}
          </p>
          <div
            className="flex items-center gap-2 text-xs mt-1 flex-wrap"
            style={{ color: "var(--text-muted)" }}
          >
            {match.round && <span>{match.round}</span>}
            {match.venue && <span>📍 {match.venue}</span>}
            {match.matchDate && <span dir="ltr">{formatMatchDateTime(match.matchDate)}</span>}
            {match.isKnockout && <span className="badge badge-pending">إقصائية</span>}
          </div>
          {priorMeetings.length > 0 && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              🔁 مواجهات سابقة:{" "}
              {priorMeetings
                .map((pm) => (pm.status === "PLAYED" ? `${pm.homeScore}-${pm.awayScore}` : "قادمة"))
                .join("، ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(onMoveUp || onMoveDown) && (
            <div className="flex flex-col gap-0.5">
              <button
                onClick={onMoveUp}
                disabled={!onMoveUp}
                className="w-6 h-5 rounded flex items-center justify-center text-xs font-bold disabled:opacity-30"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                title="تقديم"
              >
                <Icon name="chevronUp" size={12} />
              </button>
              <button
                onClick={onMoveDown}
                disabled={!onMoveDown}
                className="w-6 h-5 rounded flex items-center justify-center text-xs font-bold disabled:opacity-30"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                title="تأخير"
              >
                <Icon name="chevronDown" size={12} />
              </button>
            </div>
          )}
          <button
            onClick={onToggleResultForm}
            className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            {match.status === "PLAYED" ? "تعديل النتيجة" : "أدخل النتيجة"}
          </button>
          <button
            onClick={onDelete}
            className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            🗑
          </button>
        </div>
      </div>

      {match.status === "PLAYED" && match.goals.length > 0 && (
        <div
          className="mt-2 pt-2 flex flex-wrap gap-1.5"
          style={{ borderTop: "1px solid var(--mint-100)" }}
        >
          {match.goals.map((g) => (
            <span key={g.id} className="badge badge-active flex items-center gap-1.5">
              <PlayerAvatar photo={g.member.photo} fullName={g.member.fullName} size={18} />⚽{" "}
              {g.member.fullName}
              {g.minute ? ` ${g.minute}'` : ""}
              {g.count > 1 ? ` (${g.count})` : ""}
            </span>
          ))}
        </div>
      )}

      {match.manOfTheMatch && (
        <p
          className="text-xs mt-2 font-semibold flex items-center gap-1.5"
          style={{ color: "var(--mint-700)" }}
        >
          <PlayerAvatar
            photo={match.manOfTheMatch.photo}
            fullName={match.manOfTheMatch.fullName}
            size={20}
          />
          🌟 رجل المباراة: {match.manOfTheMatch.fullName}
        </p>
      )}

      {match.bookings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {match.bookings.map((b) => (
            <span key={b.id} className="badge badge-rejected flex items-center gap-1.5">
              <PlayerAvatar photo={b.member.photo} fullName={b.member.fullName} size={18} />
              {CARD_LABEL[b.cardType]} {b.member.fullName}
              {b.minute ? ` (${b.minute}')` : ""}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={onToggleCards}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-200)",
          }}
        >
          {showCards ? "إخفاء البطاقات" : "🟨🟥 إدارة البطاقات"}
        </button>
        <button
          onClick={onToggleMvp}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-200)",
          }}
        >
          {showMvp ? "إخفاء التصويت" : "🌟 أفضل لاعب"}
        </button>
        <button
          onClick={onToggleDetails}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-200)",
          }}
        >
          {showDetails ? "إخفاء التفاصيل" : <IconLabel name="pencil">تعديل التفاصيل</IconLabel>}
        </button>
      </div>

      {showCards && <BookingsForm match={match} teams={teams} onChange={onChange} />}
      {showResultForm && <ResultForm match={match} teams={teams} onSaved={onSaved} />}
      {showMvp && <MvpVoteAdmin match={match} teams={teams} onChange={onChange} />}
      {showDetails && <MatchDetailsForm match={match} teams={teams} onChange={onChange} />}
    </div>
  );
}
