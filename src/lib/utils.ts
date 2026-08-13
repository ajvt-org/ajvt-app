export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 8) return "يجب أن يكون رقم الهاتف 8 أرقام بالضبط";
  if (!["2", "3", "4"].includes(digits[0]))
    return "يجب أن يبدأ الرقم بـ 2 أو 3 أو 4";
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

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Converts a full-resolution /api/files/... URL to its thumbnail
// counterpart. Falls back to the original URL unchanged for files uploaded
// before compression existed (not yet .webp) — those have no thumbnail on
// disk, so the caller ends up requesting the full image, same as before.
export function toThumbUrl(url: string): string {
  return url.endsWith(".webp") ? `${url.slice(0, -".webp".length)}-thumb.webp` : url;
}
