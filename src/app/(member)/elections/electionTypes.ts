export interface MemberCandidate {
  id: string;
  fullName: string;
  photo: string | null;
}

export interface MemberElection {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  allowBlank: boolean;
  showResults: boolean;
  voted: boolean;
  _count: { candidates: number };
}

export interface MemberElectionDetail {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  allowBlank: boolean;
  shuffleCandidates: boolean;
  showResults: boolean;
  candidates: MemberCandidate[];
}

export interface ElectionDetailPayload {
  election: MemberElectionDetail;
  signedIn: boolean;
  canVote: boolean;
  myCandidateId: string | null;
  voted: boolean;
}
