import type { IconName } from "@/components/Icon";
import { memberStatusLabels } from "@/lib/messages";
import type { Status } from "@/lib/useMember";

// One description of each status, so the badge at the top of the profile and
// the card explaining it can never say different things.
//
// The status belongs to the membership payment. None of these three says
// anything about the person: a refused payment is a refused payment, and the
// account behind it carries on.
export const STATUS: Record<
  Status,
  {
    icon: IconName;
    label: string;
    title: string;
    desc: string;
    bg: string;
    border: string;
    badgeClass: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  PENDING: {
    icon: "clock",
    label: memberStatusLabels.PENDING,
    title: "الطلب قيد المراجعة",
    desc: "تم استلام الدفع. سيراجع المشرف الإثبات ويعلمك بالنتيجة قريباً.",
    bg: "#fef9ee",
    border: "#fcd34d",
    badgeClass: "badge-pending",
    iconBg: "#fef3c7",
    iconColor: "#b45309",
  },
  ACTIVE: {
    icon: "check",
    label: memberStatusLabels.ACTIVE,
    title: "تم قبول العضوية!",
    desc: "تهانينا! عضو رسمي الآن في رابطة شباب قرية التاكلالت.",
    bg: "#f0fdf4",
    border: "#86efac",
    badgeClass: "badge-active",
    iconBg: "#d1fae5",
    iconColor: "#047857",
  },
  REJECTED: {
    icon: "close",
    label: memberStatusLabels.REJECTED,
    title: "لم يُقبل إثبات الدفع",
    desc: "حسابك وبياناتك كما هي. راجع السبب أدناه، أرفق إثباتاً جديداً وأعد الإرسال.",
    bg: "#fff5f5",
    border: "#fca5a5",
    badgeClass: "badge-rejected",
    iconBg: "#fee2e2",
    iconColor: "#b91c1c",
  },
};
