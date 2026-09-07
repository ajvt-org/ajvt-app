import { toBaseFilename } from "./imageProcessing";
import { thumbnailOf } from "./uploadNames";

export interface Fingerprint {
  filename: string;
  sha256: string;
  createdAt: Date;
}

export interface StoredFile {
  name: string;
  modifiedAt: Date;
}

export function referencedNames(columns: (string | null)[][]): Set<string> {
  const named = new Set<string>();
  for (const column of columns) {
    for (const name of column) if (name) named.add(name);
  }
  return named;
}

export function orphanFingerprints(
  fingerprints: Fingerprint[],
  referenced: Set<string>,
  settledBefore: Date,
): Fingerprint[] {
  return fingerprints.filter(
    (row) => !referenced.has(row.filename) && row.createdAt < settledBefore,
  );
}

export function sharedHashes(fingerprints: Fingerprint[]): number {
  const holders = new Map<string, number>();
  for (const row of fingerprints) holders.set(row.sha256, (holders.get(row.sha256) ?? 0) + 1);
  return [...holders.values()].filter((count) => count > 1).length;
}

export function namesToKeep(referenced: Set<string>, fingerprints: Fingerprint[]): Set<string> {
  const keep = new Set<string>();
  for (const name of [...referenced, ...fingerprints.map((row) => row.filename)]) {
    keep.add(name);
    keep.add(thumbnailOf(name));
  }
  return keep;
}

export function orphanFiles(
  files: StoredFile[],
  keep: Set<string>,
  settledBefore: Date,
): StoredFile[] {
  return files.filter(
    (file) =>
      !keep.has(file.name) &&
      !keep.has(toBaseFilename(file.name)) &&
      file.modifiedAt < settledBefore,
  );
}
