import BracketSide, { type BracketSideTeam } from "@/components/tournament/BracketSide";

interface BracketMatch {
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

const CARD_HEIGHT = 64;
const CARD_GAP = 16;

export default function BracketTree({ matches }: { matches: BracketMatch[] }) {
  if (matches.length === 0) return null;

  const roundNumbers = Array.from(new Set(matches.map((m) => m.bracketRound))).sort(
    (a, b) => a - b,
  );
  const rounds = roundNumbers.map((n) => ({
    number: n,
    label: matches.find((m) => m.bracketRound === n)?.round || `الدور ${n}`,
    matches: matches.filter((m) => m.bracketRound === n).sort((a, b) => a.order - b.order),
  }));

  const firstRoundCount = rounds[0]?.matches.length || 1;
  const treeHeight = firstRoundCount * CARD_HEIGHT + (firstRoundCount - 1) * CARD_GAP;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-8" style={{ minWidth: "fit-content" }} dir="ltr">
        {rounds.map((round) => (
          <div key={round.number} className="flex flex-col" style={{ width: 170 }}>
            <p
              className="text-xs font-bold text-center mb-2"
              style={{ color: "var(--mint-700)" }}
              dir="rtl"
            >
              {round.label}
            </p>
            <div className="flex flex-col justify-around flex-1" style={{ height: treeHeight }}>
              {round.matches.map((m) => {
                const homeWinner = m.status === "PLAYED" && isWinner(m, "home");
                const awayWinner = m.status === "PLAYED" && isWinner(m, "away");
                return (
                  <div
                    key={m.id}
                    className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid var(--mint-200)", height: CARD_HEIGHT }}
                    dir="rtl"
                  >
                    <BracketSide
                      team={m.homeTeam}
                      score={m.homeScore}
                      penalties={m.homePenalties}
                      played={m.status === "PLAYED"}
                      winner={homeWinner}
                      height={CARD_HEIGHT / 2}
                      background={homeWinner ? "#d1fae5" : "white"}
                    />
                    <BracketSide
                      team={m.awayTeam}
                      score={m.awayScore}
                      penalties={m.awayPenalties}
                      played={m.status === "PLAYED"}
                      winner={awayWinner}
                      height={CARD_HEIGHT / 2}
                      background={awayWinner ? "#d1fae5" : "var(--mint-50)"}
                      borderTop="1px solid var(--mint-100)"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
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
