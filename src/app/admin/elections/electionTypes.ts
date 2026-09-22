export interface ElectionCandidateRow {
  id: string;
  fullName: string;
  photo: string | null;
  order: number;
  _count: { ballots: number };
}

export interface ElectionRow {
  id: string;
  title: string;
  hidden: boolean;
  startsAt: string;
  durationMinutes: number;
  allowBlank: boolean;
  shuffleCandidates: boolean;
  showResults: boolean;
  candidates: ElectionCandidateRow[];
  _count: { ballots: number };
}

export interface ElectionDraft {
  title: string;
  hidden: boolean;
  startsAt: string;
  durationMinutes: number;
  allowBlank: boolean;
  shuffleCandidates: boolean;
  showResults: boolean;
}

export const EMPTY_ELECTION: ElectionDraft = {
  title: "",
  hidden: true,
  startsAt: "",
  durationMinutes: 1440,
  allowBlank: false,
  shuffleCandidates: false,
  showResults: true,
};

export function draftOf(row: ElectionRow): ElectionDraft {
  return {
    title: row.title,
    hidden: row.hidden,
    startsAt: row.startsAt,
    durationMinutes: row.durationMinutes,
    allowBlank: row.allowBlank,
    shuffleCandidates: row.shuffleCandidates,
    showResults: row.showResults,
  };
}
