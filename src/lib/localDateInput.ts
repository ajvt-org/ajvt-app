const pad = (n: number) => String(n).padStart(2, "0");

function readable(value: string | Date): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function localDay(d: Date, separator: string): string {
  return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join(separator);
}

function localClock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toLocalInput(iso: string): string {
  const d = readable(iso);
  return d ? `${localDay(d, "-")}T${localClock(d)}` : "";
}

export function fromLocalInput(value: string): string {
  const d = readable(value);
  return d ? d.toISOString() : "";
}

export function localMoment(value: string | Date): { date: string; time: string } {
  const d = readable(value);
  return d ? { date: localDay(d, "/"), time: localClock(d) } : { date: "", time: "" };
}
