const GUARD_EXPORT = /export async function (require[A-Za-z]*)\s*\(/g;

const HANDLER =
  /export (?:const (GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\s*=|(?:async )?function (GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\s*\()/g;

export function guardNames(...sources: string[]): string[] {
  return sources.flatMap((source) => [...source.matchAll(GUARD_EXPORT)].map((m) => m[1]));
}

export function unguardedHandlers(source: string, guards: string[]): string[] {
  const calls = new RegExp(`\\b(?:${guards.join("|")})\\s*\\(`);
  const found = [...source.matchAll(HANDLER)];

  return found.flatMap((match, i) => {
    const body = source.slice(match.index, found[i + 1]?.index ?? source.length);
    return calls.test(body) ? [] : [(match[1] ?? match[2]) as string];
  });
}
