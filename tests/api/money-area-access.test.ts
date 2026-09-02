import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, get, createAdmin, signInAsAdmin } from "./helpers";
import { MONEY_AREAS } from "@/lib/adminNav";

import { GET as PAYMENT_PROOFS } from "@/app/api/admin/payment-proofs/route";
import { GET as PROOF_REUSE } from "@/app/api/admin/proof-reuse/route";
import { GET as RECEIPTS } from "@/app/api/admin/receipts/route";
import { GET as EXPENSES } from "@/app/api/admin/expenses/route";
import { GET as FINANCE_TAGS } from "@/app/api/admin/finance-tags/route";
import { GET as FINANCE_SUMMARY } from "@/app/api/admin/finance/summary/route";
import { GET as TREASURY } from "@/app/api/admin/finance/treasury/route";
import { GET as FINANCE_REPORT } from "@/app/api/admin/finance/report/route";
import { GET as ACTIVITY_REPORT } from "@/app/api/admin/finance/activities/route";

type Handler = (req: ReturnType<typeof get>) => Promise<Response>;

const SPAN = "from=2026-01-01&to=2026-12-31";

interface MoneyRoute {
  url: string;
  handler: Handler;
  area: string;
}

const ROUTES: MoneyRoute[] = [
  {
    url: "/api/admin/payment-proofs",
    handler: PAYMENT_PROOFS as Handler,
    area: MONEY_AREAS.payments,
  },
  {
    url: "/api/admin/proof-reuse?filename=none.jpg",
    handler: PROOF_REUSE as Handler,
    area: MONEY_AREAS.payments,
  },
  { url: "/api/admin/receipts", handler: RECEIPTS as Handler, area: MONEY_AREAS.receipts },
  { url: "/api/admin/expenses", handler: EXPENSES as Handler, area: MONEY_AREAS.expenses },
  { url: "/api/admin/finance-tags", handler: FINANCE_TAGS as Handler, area: MONEY_AREAS.expenses },
  {
    url: "/api/admin/finance/summary",
    handler: FINANCE_SUMMARY as Handler,
    area: MONEY_AREAS.expenses,
  },
  {
    url: "/api/admin/finance/treasury",
    handler: TREASURY as Handler,
    area: MONEY_AREAS.treasury,
  },
  {
    url: `/api/admin/finance/report?${SPAN}`,
    handler: FINANCE_REPORT as Handler,
    area: MONEY_AREAS.report,
  },
  {
    url: `/api/admin/finance/activities?${SPAN}`,
    handler: ACTIVITY_REPORT as Handler,
    area: MONEY_AREAS.activityReport,
  },
];

const GRANTED: Record<string, string[]> = {
  SUPER: Object.values(MONEY_AREAS),
  OWNER: Object.values(MONEY_AREAS),
  MEMBERS: [MONEY_AREAS.payments, MONEY_AREAS.receipts, MONEY_AREAS.expenses],
  ACTIVITIES: [MONEY_AREAS.payments, MONEY_AREAS.receipts, MONEY_AREAS.expenses],
  QUIZ: [],
  ACTIVITY: [],
};

async function statusFor(route: MoneyRoute): Promise<number> {
  return (await route.handler(get(route.url))).status;
}

describe("the money routes answer to the same areas the navigation does", () => {
  beforeEach(async () => {
    await resetDb();
  });

  for (const [role, granted] of Object.entries(GRANTED)) {
    const refused = ROUTES.filter((route) => !granted.includes(route.area));
    const allowed = ROUTES.filter((route) => granted.includes(route.area));

    if (refused.length > 0) {
      it(`refuses ${role} the screens it cannot open`, async () => {
        await signInAsAdmin(await createAdmin(`a-${role.toLowerCase()}`, role));

        for (const route of refused) {
          expect(await statusFor(route), route.url).toBe(403);
        }
      });
    }

    if (allowed.length > 0) {
      it(`answers ${role} on the screens it can open`, async () => {
        await signInAsAdmin(await createAdmin(`b-${role.toLowerCase()}`, role));

        for (const route of allowed) {
          expect(await statusFor(route), route.url).toBe(200);
        }
      });
    }
  }

  it("refuses a signed out caller everywhere", async () => {
    for (const route of ROUTES) {
      expect(await statusFor(route), route.url).toBe(401);
    }
  });
});
