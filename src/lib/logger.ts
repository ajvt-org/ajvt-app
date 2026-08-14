// One line of JSON per event in production so a log viewer can filter it, and
// something readable in development. Never pass a member's phone, name or
// proof filename in here — the association's logs are not the place for them.
type Level = "info" | "warn" | "error";

function emit(level: Level, event: string, detail?: unknown) {
  const error =
    detail instanceof Error ? { name: detail.name, message: detail.message } : (detail ?? null);

  if (process.env.NODE_ENV === "production") {
    console[level](JSON.stringify({ level, event, error, at: new Date().toISOString() }));
    return;
  }
  console[level](`[${level}] ${event}`, error ?? "");
}

export const logger = {
  info: (event: string, detail?: unknown) => emit("info", event, detail),
  warn: (event: string, detail?: unknown) => emit("warn", event, detail),
  error: (event: string, detail?: unknown) => emit("error", event, detail),
};
