import MatchDayList from "@/components/tournament/MatchDayList";
import MatchFixture from "@/components/tournament/MatchFixture";
import MatchResult from "@/components/tournament/MatchResult";
import TournamentSection from "@/components/tournament/TournamentSection";
import type { PublicMatch } from "@/components/tournament/publicTypes";
import { publicTournament as texts } from "@/lib/texts";

export default function MatchesPanel({
  played,
  scheduled,
  allMatches,
  football,
  tournamentTitle,
  loggedIn,
  myVoteByVoteId,
}: {
  played: PublicMatch[];
  scheduled: PublicMatch[];
  allMatches: PublicMatch[];
  football: boolean;
  tournamentTitle: string;
  loggedIn: boolean;
  myVoteByVoteId: Map<string, string>;
}) {
  if (played.length === 0 && scheduled.length === 0) {
    return (
      <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
        {texts.noMatchesYet}
      </p>
    );
  }

  return (
    <>
      {scheduled.length > 0 && (
        <TournamentSection icon="calendar" title={texts.upcoming}>
          <MatchDayList
            matches={scheduled}
            renderMatch={(match, day) => <MatchFixture key={match.id} match={match} day={day} />}
          />
        </TournamentSection>
      )}
      {played.length > 0 && (
        <TournamentSection icon="check" title={texts.results}>
          <MatchDayList
            matches={played}
            renderMatch={(match, day) => (
              <MatchResult
                key={match.id}
                match={match}
                day={day}
                allMatches={allMatches}
                football={football}
                tournamentTitle={tournamentTitle}
                loggedIn={loggedIn}
                myVoteCandidateId={
                  match.mvpVote ? (myVoteByVoteId.get(match.mvpVote.id) ?? null) : null
                }
              />
            )}
          />
        </TournamentSection>
      )}
    </>
  );
}
