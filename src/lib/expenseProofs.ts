export function cleanProofNames(names: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const name of names) {
    const filename = name?.trim();
    if (!filename || seen.has(filename)) continue;
    seen.add(filename);
    kept.push(filename);
  }
  return kept;
}

export function proofsToAdd(held: readonly string[], wanted: readonly string[]): string[] {
  return wanted.filter((filename) => !held.includes(filename));
}

export function proofsToRemove(held: readonly string[], wanted: readonly string[]): string[] {
  return held.filter((filename) => !wanted.includes(filename));
}

export function leadProof(names: readonly string[]): string | null {
  return names[0] ?? null;
}
