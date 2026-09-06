export interface HistoryTrail {
  notePop(): void;
  noteLocation(url: string): void;
  noteReplacement(url: string): void;
  previousIs(url: string): boolean;
}

export function createTrail(): HistoryTrail {
  const seen: string[] = [];
  let index = 0;
  let popped = false;

  function land(url: string) {
    seen.length = 0;
    seen.push(url);
    index = 0;
  }

  return {
    notePop() {
      popped = true;
    },

    noteLocation(url: string) {
      const wentBack = popped;
      popped = false;
      if (seen.length === 0) {
        seen.push(url);
        return;
      }
      if (seen[index] === url) return;
      if (wentBack) {
        if (index > 0 && seen[index - 1] === url) {
          index -= 1;
          return;
        }
        if (seen[index + 1] === url) {
          index += 1;
          return;
        }
        land(url);
        return;
      }
      seen.length = index + 1;
      seen.push(url);
      index += 1;
    },

    noteReplacement(url: string) {
      if (seen.length === 0) {
        seen.push(url);
        return;
      }
      seen.length = index + 1;
      seen[index] = url;
    },

    previousIs(url: string) {
      return index > 0 && seen[index - 1] === url;
    },
  };
}

export const appTrail = createTrail();
