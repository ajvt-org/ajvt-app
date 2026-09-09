export const PHONE_COUNTRY_CODE = "222";

export function internationalPhone(phone: string): string {
  return `${PHONE_COUNTRY_CODE}${phone.replace(/\D/g, "")}`;
}

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

export function toThumbUrl(url: string): string {
  return url.endsWith(".webp") ? `${url.slice(0, -".webp".length)}-thumb.webp` : url;
}
