import { activityWorkspace, memberPage } from "./texts";
import { withoutFrom } from "./backLink";
import { safeNextPath } from "./utils";

const MEMBERS = "/admin/dashboard";

export interface BackLink {
  href: string;
  label: string;
}

function pathOf(href: string): string {
  const query = href.indexOf("?");
  return query === -1 ? href : href.slice(0, query);
}

function labelFor(href: string): string {
  const path = pathOf(href);
  if (path.startsWith("/admin/activities/")) return memberPage.backToActivity;
  if (path === "/admin/activities") return activityWorkspace.backToIndex;
  if (path === MEMBERS) return memberPage.backToMembers;
  if (path === "/admin") return memberPage.backToAdminHome;
  return memberPage.back;
}

export function adminBackLink(from: string | null | undefined): BackLink {
  const href = safeNextPath(from, MEMBERS);
  return { href, label: labelFor(href) };
}

export function memberCardHref(memberId: string, from: string): string {
  const card = `/admin/members/${memberId}`;
  const origin = from ? withoutFrom(from) : "";
  return origin ? `${card}?from=${encodeURIComponent(origin)}` : card;
}
