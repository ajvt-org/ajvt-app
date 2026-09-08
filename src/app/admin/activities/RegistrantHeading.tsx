import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";

export default function RegistrantHeading({ icon, title }: { icon: IconName; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-xs font-bold shrink-0" style={{ color: "var(--text-muted)" }}>
        <IconLabel name={icon} size={12}>
          {title}
        </IconLabel>
      </span>
      <span className="flex-1 h-px" style={{ background: "var(--mint-200)" }} aria-hidden />
    </div>
  );
}
