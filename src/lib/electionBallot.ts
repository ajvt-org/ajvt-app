import { seededShuffle } from "./seededShuffle";

export interface OrderedCandidate {
  id: string;
  order: number;
}

export function candidateOrderFor<T extends OrderedCandidate>(
  election: { id: string; shuffleCandidates: boolean },
  candidates: T[],
  userId: string | null,
): T[] {
  const byOrder = [...candidates].sort((a, b) => a.order - b.order);
  if (!election.shuffleCandidates || !userId) return byOrder;
  return seededShuffle(byOrder, `${election.id}:${userId}`);
}
