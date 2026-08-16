import Icon from "@/components/Icon";
import { STATUS } from "@/lib/memberStatus";
import type { Status } from "@/lib/useMember";

export default function MemberStatusCard({ status }: { status: Status }) {
  const cfg = STATUS[status];

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
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            {cfg.desc}
          </p>
        </div>
      </div>
    </div>
  );
}
