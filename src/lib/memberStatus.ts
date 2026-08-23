import type { IconName } from "@/components/Icon";
import type { Status } from "@/lib/useMember";

// One description of each status, so the badge at the top of the profile and
// the card explaining it can never say different things.
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
    label: "قيد الانتظار",
    title: "الطلب قيد المراجعة",
    desc: "تم استلام الطلب. سيقوم المشرف بمراجعة البيانات وإثبات الدفع وإعلامك بالنتيجة قريباً.",
    bg: "#fef9ee",
    border: "#fcd34d",
    badgeClass: "badge-pending",
    iconBg: "#fef3c7",
    iconColor: "#b45309",
  },
  ACTIVE: {
    icon: "check",
    label: "معتمد",
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
    label: "غير مقبول",
    title: "لم يتم قبول الطلب",
    desc: "نأسف لإعلامك أنه لم يتم قبول هذا الطلب. يمكنك التواصل مع المشرف لمزيد من المعلومات.",
    bg: "#fff5f5",
    border: "#fca5a5",
    badgeClass: "badge-rejected",
    iconBg: "#fee2e2",
    iconColor: "#b91c1c",
  },
};
