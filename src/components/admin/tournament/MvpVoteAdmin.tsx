"use client";

import type { DecidedMatch, Team } from "./types";
import MvpVoteOpen from "./MvpVoteOpen";
import MvpVoteResults from "./MvpVoteResults";

export default function MvpVoteAdmin({
  match,
  teams,
  defaultMinutes,
  onChange,
}: {
  match: DecidedMatch;
  teams: Team[];
  defaultMinutes: number;
  onChange: () => void;
}) {
  if (match.mvpVote) {
    return (
      <MvpVoteResults
        matchId={match.id}
        vote={match.mvpVote}
        defaultMinutes={defaultMinutes}
        onChange={onChange}
      />
    );
  }

  const roster = [match.homeTeam.id, match.awayTeam.id].flatMap(
    (id) => teams.find((t) => t.id === id)?.members.map((m) => m.member) || [],
  );

  return (
    <MvpVoteOpen
      matchId={match.id}
      played={match.status === "PLAYED"}
      roster={roster}
      defaultMinutes={defaultMinutes}
      onChange={onChange}
    />
  );
}
