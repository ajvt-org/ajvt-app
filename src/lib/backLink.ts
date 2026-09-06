export function withoutFrom(path: string): string {
  const query = path.indexOf("?");
  if (query === -1) return path;
  const params = new URLSearchParams(path.slice(query + 1));
  params.delete("from");
  const rest = params.toString();
  return rest ? `${path.slice(0, query)}?${rest}` : path.slice(0, query);
}

export function withFrom(target: string, origin: string): string {
  if (!origin) return target;
  const from = `from=${encodeURIComponent(withoutFrom(origin))}`;
  return target.includes("?") ? `${target}&${from}` : `${target}?${from}`;
}
