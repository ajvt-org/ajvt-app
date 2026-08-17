import { toCsv, downloadCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/utils";
import { STATUS_LABEL } from "./constants";
import type { Member } from "./types";

const HEADERS = [
  "الاسم الكامل",
  "رقم الهاتف",
  "العصر",
  "طريقة الدفع",
  "الحالة",
  "سنة العضوية",
  "رقم العضوية",
  "تاريخ الطلب",
];

export function exportMembers(members: Member[]) {
  const rows = members.map((m) => [
    m.fullName,
    m.user?.phone || "",
    m.age,
    m.paymentMethod,
    STATUS_LABEL[m.status],
    String(m.membershipYear),
    m.memberNumber || "",
    formatDateTime(m.createdAt),
  ]);
  downloadCsv(`members-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(HEADERS, rows));
}
