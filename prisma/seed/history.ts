import { prisma } from "./client";
import { retentionExpiry } from "../../src/lib/deletedRecords";
import { daysAgo, fullName, pick } from "./random";
import { ACTION_LABELS } from "../../src/lib/auditLabels";

const ACTIONS = Object.keys(ACTION_LABELS);

export async function seedSiteVisits(days: number) {
  for (let d = 0; d < days; d++) {
    const date = daysAgo(d).toISOString().slice(0, 10);
    for (let v = 0; v < 3 + (d % 7); v++) {
      await prisma.siteVisit.create({
        data: { date, visitorId: `seed-visitor-${d}-${v}`, pageViews: 1 + ((d + v) % 5) },
      });
    }
  }
}

export async function seedAuditLog(count: number) {
  for (let i = 0; i < count; i++) {
    await prisma.auditLog.create({
      data: {
        adminUsername: "admin",
        action: pick(ACTIONS, i),
        targetLabel: fullName(i),
        createdAt: daysAgo(10 - (i % 10)),
      },
    });
  }
}

export async function seedDeletedRecords() {
  const now = new Date();

  await prisma.deletedRecord.create({
    data: {
      kind: "Member",
      recordId: "seed-deleted-member",
      label: fullName(77),
      data: {
        id: "seed-deleted-member",
        fullName: fullName(77),
        age: "البدريين",
        paymentMethod: "بنكيلي",
        status: "PENDING",
      },
      deletedBy: "admin",
      deletedAt: daysAgo(2),
      expiresAt: retentionExpiry(daysAgo(2)),
    },
  });

  await prisma.deletedRecord.create({
    data: {
      kind: "Member",
      recordId: "seed-expiring-member",
      label: fullName(78),
      data: { id: "seed-expiring-member", fullName: fullName(78) },
      deletedBy: "admin",
      deletedAt: daysAgo(29),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
  });
}
