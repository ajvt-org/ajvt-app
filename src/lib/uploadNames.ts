export const THUMBNAIL_SUFFIX = "-thumb";

export function thumbnailOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return `${filename}${THUMBNAIL_SUFFIX}`;
  return `${filename.slice(0, dot)}${THUMBNAIL_SUFFIX}${filename.slice(dot)}`;
}

export function namesToRelease(names: (string | null | undefined)[]): string[] {
  return [...new Set(names.filter((name): name is string => Boolean(name)))];
}
