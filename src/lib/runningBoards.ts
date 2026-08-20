import type { BoardConfig } from "./competitionConfig";

export interface HeldBoard {
  id: string;
  blockRounds: number;
  counting: number;
  wholeRun: boolean;
}

export interface MergedBoard extends BoardConfig {
  id?: string;
  blockTitle: string;
}

export function mergeRunningBoards(held: HeldBoard[], incoming: BoardConfig[]): MergedBoard[] {
  const byId = new Map(held.map((board) => [board.id, board]));
  return incoming.map((board) => {
    const kept = board.id ? byId.get(board.id) : undefined;
    return {
      id: kept?.id,
      title: board.title,
      blockTitle: board.blockTitle ?? "",
      blockRounds: kept ? kept.blockRounds : board.blockRounds,
      counting: kept ? kept.counting : board.counting,
      wholeRun: kept ? kept.wholeRun : board.wholeRun === true,
    };
  });
}

export function droppedBoards(held: HeldBoard[], merged: MergedBoard[]): string[] {
  const keeping = new Set(merged.map((board) => board.id).filter(Boolean));
  return held.filter((board) => !keeping.has(board.id)).map((board) => board.id);
}
