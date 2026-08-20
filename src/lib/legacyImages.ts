export type LegacyPlan =
  | { kind: "reencode"; filename: string; webp: string; thumb: string }
  | { kind: "thumbnail"; filename: string; thumb: string };

function baseOf(filename: string): string {
  return filename.replace(/\.\w+$/, "");
}

export function webpNameOf(filename: string): string {
  return `${baseOf(filename)}.webp`;
}

export function thumbNameOf(filename: string): string {
  return `${baseOf(filename)}-thumb.webp`;
}

export function planFor(filename: string, onDisk: Set<string>): LegacyPlan | null {
  if (!filename.endsWith(".webp")) {
    return { kind: "reencode", filename, webp: webpNameOf(filename), thumb: thumbNameOf(filename) };
  }
  if (!onDisk.has(thumbNameOf(filename))) {
    return { kind: "thumbnail", filename, thumb: thumbNameOf(filename) };
  }
  return null;
}
