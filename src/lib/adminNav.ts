import { hasFullAccess } from "./adminRoles";

export const ALL_AREAS = null;

export const MONEY_AREAS = {
  payments: "/admin/payments",
  receipts: "/admin/receipts",
  supporters: "/admin/supporters",
  expenses: "/admin/expenses",
  treasury: "/admin/treasury",
  report: "/admin/finance-report",
  activityReport: "/admin/finance-activities",
} as const;

const OWN_ACCOUNT = ["/admin/tools", "/admin/password"];

const SHARED_MONEY = [
  MONEY_AREAS.payments,
  MONEY_AREAS.receipts,
  MONEY_AREAS.supporters,
  MONEY_AREAS.expenses,
];

const ROLE_AREAS: Record<string, string[] | null> = {
  MEMBERS: [
    "/admin/dashboard",
    "/admin/members",
    ...SHARED_MONEY,
    "/admin/deleted",
    ...OWN_ACCOUNT,
  ],
  ACTIVITIES: ["/admin/activities", ...SHARED_MONEY, ...OWN_ACCOUNT],
  QUIZ: ["/admin/quiz", ...OWN_ACCOUNT],
  ACTIVITY: ["/admin/activities", ...OWN_ACCOUNT],
};

export function allowedAreas(role: string | null | undefined): string[] | null {
  if (role === null || role === undefined) return ALL_AREAS;
  if (hasFullAccess(role)) return ALL_AREAS;
  if (!(role in ROLE_AREAS)) return [];
  return ROLE_AREAS[role];
}

function under(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function canOpen(role: string | null | undefined, pathname: string): boolean {
  const areas = allowedAreas(role);
  if (areas === ALL_AREAS) return true;
  return areas.some((area) => under(pathname, area));
}

const TAB_ALIASES: Record<string, string[]> = {
  "/admin/dashboard": ["/admin/members"],
  "/admin/activities": ["/admin/tournament"],
  "/admin/tools": [
    "/admin/password",
    "/admin/admins",
    "/admin/audit-log",
    "/admin/broadcast",
    "/admin/deleted",
  ],
};

export function tabActive(tabHref: string, pathname: string | null): boolean {
  if (!pathname) return false;
  const prefixes = [tabHref, ...(TAB_ALIASES[tabHref] ?? [])];
  return prefixes.some((prefix) => under(pathname, prefix));
}

export function landingFor(role: string | null | undefined): string | null {
  const areas = allowedAreas(role);
  if (areas === ALL_AREAS) return null;
  return areas[0] ?? null;
}
