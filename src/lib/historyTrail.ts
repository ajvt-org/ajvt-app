function sameOrigin(referrer: string, origin: string): boolean {
  if (!referrer) return false;
  try {
    return new URL(referrer).origin === origin;
  } catch {
    return false;
  }
}

export interface HistoryTrail {
  noteLocation(url: string): void;
  canUnwind(): boolean;
}

export function createTrail(openedFromApp: () => boolean): HistoryTrail {
  const seen: string[] = [];
  let index = 0;
  let rooted: boolean | null = null;

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
      if (rooted === null) rooted = openedFromApp();
      return index > 0 || rooted;
    },
  };
}

export const appTrail = createTrail(() =>
  typeof document === "undefined" ? false : sameOrigin(document.referrer, window.location.origin),
);
