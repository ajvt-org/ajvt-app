export function releaseFrom(subject: string | null, commit?: string): string {
  const match = subject?.match(/^Release (\d+\.\d+\.\d+)\b/);
  if (match) return match[1];
  return commit ? commit.slice(0, 7) : "dev";
}
