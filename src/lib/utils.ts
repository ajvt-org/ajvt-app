export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 8) return "يجب أن يكون رقم الهاتف 8 أرقام بالضبط";
  if (!["2", "3", "4"].includes(digits[0])) return "يجب أن يبدأ الرقم بـ 2 أو 3 أو 4";
  return null;
}

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

// One date shape for the whole app: year/month/day, zero padded, built by
// hand. toLocaleDateString("ar-DZ") writes the month out and embeds
// right-to-left marks; inside the dir="ltr" spans that hold digits, those
// marks reorder the parts on screen.
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function numericDate(d: Date): string {
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return `${numericDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(date: Date | string): string {
  return numericDate(new Date(date));
}

// The daily rollups key their rows by "YYYY-MM-DD". Handing that straight to
// new Date() reads it as UTC midnight, which lands on the previous day for
// anyone west of Greenwich, so the parts are split out and rebuilt locally.
export function formatDayKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return numericDate(new Date(year, month - 1, day));
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Converts a full-resolution /api/files/... URL to its thumbnail
// counterpart. Falls back to the original URL unchanged for files uploaded
// before compression existed (not yet .webp) — those have no thumbnail on
// disk, so the caller ends up requesting the full image, same as before.
export function toThumbUrl(url: string): string {
  return url.endsWith(".webp") ? `${url.slice(0, -".webp".length)}-thumb.webp` : url;
}
