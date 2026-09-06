export interface HistoryTrail {
  noteLocation(url: string): void;
  canUnwind(): boolean;
  previousIs(url: string): boolean;
}

export function createTrail(): HistoryTrail {
  const seen: string[] = [];
  let index = 0;

  return {
    noteLocation(url: string) {
      if (seen.length === 0) {
        seen.push(url);
        return;
      }
      if (seen[index] === url) return;
      if (index > 0 && seen[index - 1] === url) {
        index -= 1;
        return;
      }
      if (seen[index + 1] === url) {
        index += 1;
        return;
      }
      seen.length = index + 1;
      seen.push(url);
      index += 1;
    },

    canUnwind() {
      return index > 0;
    },

    previousIs(url: string) {
      return index > 0 && seen[index - 1] === url;
    },
  };
}

export const appTrail = createTrail();
