"use client";

import Link from "next/link";
import BlockTimer from "@/components/BlockTimer";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PageHeader from "@/components/PageHeader";
import { useNow } from "@/hooks/useNow";
import { ELECTION_URGENT_SHARE, electionState, endsAt } from "@/lib/election";
import { electionMember as texts } from "@/lib/texts";
import BallotPicker from "./BallotPicker";
import CandidateList from "./CandidateList";
import ElectionResult from "@/components/ElectionResult";
import MarkedBallot from "./MarkedBallot";
import ElectionClock from "./ElectionClock";
import type { ElectionDetailPayload } from "./electionTypes";

export default function ElectionView({
  payload,
  backHref,
  membershipHref,
  onReached,
}: {
  payload: ElectionDetailPayload;
  backHref: string;
  membershipHref: string;
  onReached: () => void;
}) {
  const { election, signedIn, canVote, voted, myCandidateId, result } = payload;
  const now = useNow(1000);
  const state = electionState(election, new Date(now));
  const voting = state === "open" && canVote && !voted;

  return (
    <div className="app-shell">
      <PageHeader title={texts.listTitle} backHref={backHref} />

      <div className="flex-1 px-5 py-6 space-y-5">
        <h2 className="activity-title text-lg" style={{ color: "var(--text-main)" }}>
          {election.title}
        </h2>

        <div className="card p-4 space-y-3">
          <ElectionClock election={election} onReached={onReached} now={now} />
          {state === "open" && (
            <BlockTimer
              opensAt={new Date(election.startsAt).toISOString()}
              closesAt={endsAt(election).toISOString()}
              label={texts.windowLabel}
              onReached={onReached}
              urgentShare={ELECTION_URGENT_SHARE}
              now={now}
            />
          )}
        </div>

        {state === "open" && !canVote && (
          <div className="card p-4 text-center space-y-3">
            <div className="flex justify-center" style={{ color: "var(--mint-500)" }}>
              <Icon name="ballot" size={28} />
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              {signedIn ? texts.membersOnly : texts.signInToVote}
            </p>
            {!signedIn && (
              <Link href={membershipHref} className="btn btn-primary btn-sm">
                <IconLabel name="user">{texts.signIn}</IconLabel>
              </Link>
            )}
          </div>
        )}

        {state === "ended" &&
          (result ? (
            <ElectionResult result={result} allowBlank={election.allowBlank} />
          ) : (
            <div className="card p-4 text-center space-y-1">
              <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
                {texts.ended}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {texts.resultHeld}
              </p>
            </div>
          ))}

        {!result && (
          <div className="space-y-2">
            <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              {texts.candidates}
            </p>
            {voting ? (
              <BallotPicker
                electionId={election.id}
                candidates={election.candidates}
                allowBlank={election.allowBlank}
                onCast={onReached}
              />
            ) : voted ? (
              <MarkedBallot
                candidates={election.candidates}
                allowBlank={election.allowBlank}
                mine={myCandidateId}
              />
            ) : (
              <CandidateList candidates={election.candidates} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
