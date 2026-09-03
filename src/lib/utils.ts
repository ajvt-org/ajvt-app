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

export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  const path = next.replace(/[\t\n\r]/g, "").trim();
  if (!path.startsWith("/") || path[1] === "/" || path[1] === "\\") return fallback;
  return path;
}

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

export function formatDayKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return numericDate(new Date(year, month - 1, day));
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toThumbUrl(url: string): string {
  return url.endsWith(".webp") ? `${url.slice(0, -".webp".length)}-thumb.webp` : url;
}
