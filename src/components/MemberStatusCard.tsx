import Icon from "@/components/Icon";
import type { Status } from "@/lib/useMembers";

const CONFIGS = {
  PENDING: {
    icon: "clock" as const,
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
    icon: "check" as const,
    label: "مقبول",
    title: "تم قبول العضوية!",
    desc: "تهانينا! عضو رسمي الآن في رابطة شباب قرية التاكلالت.",
    bg: "#f0fdf4",
    border: "#86efac",
    badgeClass: "badge-active",
    iconBg: "#d1fae5",
    iconColor: "#047857",
  },
  REJECTED: {
    icon: "close" as const,
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

export default function MemberStatusCard({ status }: { status: Status }) {
  const cfg = CONFIGS[status];

  return (
    <div className="card p-5" style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 pulse"
          style={{ background: cfg.iconBg, color: cfg.iconColor }}
        >
          <Icon name={cfg.icon} size={26} />
        </div>
        <div className="flex-1">
          <h2 className="font-black text-base mb-1" style={{ color: "var(--text-main)" }}>
            {cfg.title}
          </h2>
          <span className={`badge ${cfg.badgeClass} mb-2`}>{cfg.label}</span>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            {cfg.desc}
          </p>
        </div>
      </div>
    </div>
  );
}
