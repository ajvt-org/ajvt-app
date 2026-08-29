import type { IconName } from "@/components/Icon";
import { memberStatusLabels } from "@/lib/messages";
import type { Status } from "@/lib/useMember";

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
