import { BlankFace, CandidateFace, CheckSlot, rowLook } from "./BallotRow";
import type { MemberCandidate } from "./electionTypes";

function Row({ marked, children }: { marked: boolean; children: React.ReactNode }) {
  return (
    <div
      aria-current={marked ? "true" : undefined}
      className="card p-3 flex items-center gap-3"
      style={rowLook(marked)}
    >
      <CheckSlot marked={marked} />
      {children}
    </div>
  );
}

export default function MarkedBallot({
  candidates,
  allowBlank,
  mine,
}: {
  candidates: MemberCandidate[];
  allowBlank: boolean;
  mine: string | null;
}) {
  return (
    <div className="space-y-2">
      {candidates.map((candidate) => (
        <Row key={candidate.id} marked={mine === candidate.id}>
          <CandidateFace candidate={candidate} />
        </Row>
      ))}
      {allowBlank && (
        <Row marked={mine === null}>
          <BlankFace />
        </Row>
      )}
    </div>
  );
}
