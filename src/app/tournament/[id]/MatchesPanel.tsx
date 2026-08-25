import MatchDayList from "@/components/tournament/MatchDayList";
import MatchFixture from "@/components/tournament/MatchFixture";
import MatchResult from "@/components/tournament/MatchResult";
import TournamentSection from "@/components/tournament/TournamentSection";
import type { PublicMatch } from "@/components/tournament/publicTypes";
import { memberTeamName } from "@/lib/matchEvents";
import { publicTournament as texts } from "@/lib/texts";

export default function MatchesPanel({
  played,
  scheduled,
  allMatches,
  football,
  tournamentTitle,
  loggedIn,
  myVoteByVoteId,
  teams,
}: {
  played: PublicMatch[];
  scheduled: PublicMatch[];
  allMatches: PublicMatch[];
  football: boolean;
  tournamentTitle: string;
  loggedIn: boolean;
  myVoteByVoteId: Map<string, string>;
  teams: { name: string; members: { member: { id: string } }[] }[];
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
                manOfTheMatchTeam={memberTeamName(match.manOfTheMatch?.id, teams)}
                myVoteCandidateId={
                  match.mvpVote ? (myVoteByVoteId.get(match.mvpVote.id) ?? null) : null
                }
              />
            )}
          />
        </TournamentSection>
      )}
      {scheduled.length > 0 && (
        <TournamentSection icon="calendar" title={texts.upcoming}>
          <MatchDayList
            matches={scheduled}
            renderMatch={(match, day) => <MatchFixture key={match.id} match={match} day={day} />}
          />
        </TournamentSection>
      )}
    </>
  );
}
