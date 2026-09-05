import BracketSide, { type BracketSideTeam } from "@/components/tournament/BracketSide";
import { CARD_HEIGHT } from "@/lib/bracketLayout";
import type { EntrantKind } from "@/lib/entrant";

export interface BracketMatch {
  id: string;
  bracketRound: number;
  order: number;
  round: string | null;
  homeTeam: BracketSideTeam | null;
  awayTeam: BracketSideTeam | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  status: "SCHEDULED" | "PLAYED";
}

export default function BracketMatchCard({
  match,
  top,
  entrant = "team",
}: {
  match: BracketMatch;
  top: number;
  entrant?: EntrantKind;
}) {
  const homeWinner = match.status === "PLAYED" && isWinner(match, "home");
  const awayWinner = match.status === "PLAYED" && isWinner(match, "away");

  return (
    <div
      className="absolute inset-x-0 rounded-xl overflow-hidden"
      style={{ top, height: CARD_HEIGHT, border: "1px solid var(--mint-200)" }}
      dir="rtl"
    >
      <BracketSide
        team={match.homeTeam}
        score={match.homeScore}
        penalties={match.homePenalties}
        played={match.status === "PLAYED"}
        winner={homeWinner}
        height={CARD_HEIGHT / 2}
        background={homeWinner ? "#d1fae5" : "white"}
        entrant={entrant}
      />
      <BracketSide
        team={match.awayTeam}
        score={match.awayScore}
        penalties={match.awayPenalties}
        played={match.status === "PLAYED"}
        winner={awayWinner}
        height={CARD_HEIGHT / 2}
        background={awayWinner ? "#d1fae5" : "var(--mint-50)"}
        borderTop="1px solid var(--mint-100)"
        entrant={entrant}
      />
    </div>
  );
}

function isWinner(m: BracketMatch, side: "home" | "away"): boolean {
  if (m.homeScore === null || m.awayScore === null) return false;
  if (m.homeScore !== m.awayScore) {
    return side === "home" ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
  }
  if (m.homePenalties !== null && m.awayPenalties !== null) {
    return side === "home" ? m.homePenalties > m.awayPenalties : m.awayPenalties > m.homePenalties;
  }
  return false;
}
