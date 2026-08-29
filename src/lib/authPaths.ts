export const USER_PROTECTED = ["/home", "/profile", "/change-password", "/membership"];
export const ADMIN_PROTECTED = ["/admin/dashboard"];
export const CHANGE_PASSWORD_PATH = "/change-password";

export function isUserProtected(pathname: string): boolean {
  return USER_PROTECTED.some((p) => pathname.startsWith(p));
}

export function isAdminProtected(pathname: string): boolean {
  return ADMIN_PROTECTED.some((p) => pathname.startsWith(p));
}

export function isProtectedForm(pathname: string, params: URLSearchParams): boolean {
  return pathname.startsWith("/form") && params.has("id");
}

export function needsSession(target: string): boolean {
  const [pathname, query = ""] = target.split("?");
  return (
    isUserProtected(pathname) ||
    isAdminProtected(pathname) ||
    isProtectedForm(pathname, new URLSearchParams(query))
  );
}

export function backFromNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return needsSession(next) ? fallback : next;
}
