import Icon from "@/components/Icon";
import Toggle from "@/components/Toggle";

function LockedMark({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      aria-disabled
      aria-label={label}
      className="shrink-0 inline-flex items-center justify-center rounded-full"
      style={{
        width: 28,
        height: 28,
        background: on ? "var(--mint-100)" : "white",
        color: on ? "var(--mint-700)" : "var(--text-muted)",
        border: `1.5px solid ${on ? "var(--mint-500)" : "var(--mint-200)"}`,
      }}
    >
      <Icon name={on ? "check" : "close"} size={14} />
    </span>
  );
}

export default function SettingRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange?: (next: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-3"
      style={{ minHeight: 44, background: "var(--surface-2)" }}
    >
      <span className="text-xs font-bold min-w-0" style={{ color: "var(--text-main)" }}>
        {label}
      </span>
      {onChange ? (
        <Toggle label={label} checked={checked} onChange={onChange} />
      ) : (
        <LockedMark label={label} on={checked} />
      )}
    </div>
  );
}
