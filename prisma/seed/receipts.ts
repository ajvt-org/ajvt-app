import { prisma } from "./client";
import { daysAgo } from "./random";
import { ensureReceiptsFor } from "../../src/lib/paymentReceiptServer";
import { issueReceipt, voidReceipt } from "../../src/lib/officialReceiptServer";
import { SETTINGS_ID, defaultSettings } from "../../src/lib/settings";

const SECRETARY = "محمد الأمين ولد أحمد";
const TREASURER = "أحمد سالم ولد محمدن";

export async function seedOfficers() {
  await prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { secretaryName: SECRETARY, treasurerName: TREASURER },
    create: {
      id: SETTINGS_ID,
      ...defaultSettings(),
      secretaryName: SECRETARY,
      treasurerName: TREASURER,
    },
  });
}

export async function seedReceipts() {
  await ensureReceiptsFor(prisma, {});

  const standalone = await issueReceipt({
    payerName: "السيدة فاطمة محمد عبد الله",
    reason: "دعم عام للرابطة",
    amount: 5000,
    issuedOn: daysAgo(3, 11),
    issuedBy: "admin",
  });

  const cancelled = await issueReceipt({
    payerName: "أحمد ولد سيدي",
    reason: "دعم نشاط",
    amount: 1500,
    issuedOn: daysAgo(2, 9),
    issuedBy: "admin",
  });
  await voidReceipt(cancelled.number, "خطأ في المبلغ المسجل", "admin");

  const fromPayments = await prisma.receipt.count({ where: { paymentId: { not: null } } });
  return { fromPayments, standalone: standalone.number, cancelled: cancelled.number };
}
