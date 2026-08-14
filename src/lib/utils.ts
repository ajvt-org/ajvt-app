export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 8) return "يجب أن يكون رقم الهاتف 8 أرقام بالضبط";
  if (!["2", "3", "4"].includes(digits[0])) return "يجب أن يبدأ الرقم بـ 2 أو 3 أو 4";
  return null;
}

// Appends the current location as `?next=` to a login path, so that after
// signing back in the user returns to what they were doing instead of a
// generic dashboard/home. Client-side only (reads window.location).
export function loginPathWithNext(loginPath: "/login" | "/admin/login"): string {
  if (typeof window === "undefined") return loginPath;
  const next = window.location.pathname + window.location.search;
  if (next === "/" || next.startsWith(loginPath)) return loginPath;
  return `${loginPath}?next=${encodeURIComponent(next)}`;
}

// Validates a `next` redirect target so login pages can't be turned into an
// open redirect (e.g. /login?next=https://evil.example) — only same-origin
// relative paths are accepted.
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

// Dates render in two shapes: written out for a single field, compact and
// numeric for list rows. The numeric ones are built by hand because
// toLocaleString("ar") embeds right-to-left marks, and the spans holding them
// are dir="ltr" to keep digits in order; together those reorder the parts on
// screen.
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// The daily rollups key their rows by "YYYY-MM-DD". Handing that straight to
// new Date() reads it as UTC midnight, which lands on the previous day for
// anyone west of Greenwich, so the parts are split out and rebuilt locally.
export function formatDayKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return formatDate(new Date(year, month - 1, day));
}

export function formatFullDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ar-DZ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Converts a full-resolution /api/files/... URL to its thumbnail
// counterpart. Falls back to the original URL unchanged for files uploaded
// before compression existed (not yet .webp) — those have no thumbnail on
// disk, so the caller ends up requesting the full image, same as before.
export function toThumbUrl(url: string): string {
  return url.endsWith(".webp") ? `${url.slice(0, -".webp".length)}-thumb.webp` : url;
}
