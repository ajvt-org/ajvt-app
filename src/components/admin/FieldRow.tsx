import { useId } from "react";

export default function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();

  return (
    <div className="flex items-start gap-2.5">
      <label
        htmlFor={id}
        className="shrink-0 text-xs font-bold pt-2.5"
        style={{ width: 76, color: "var(--text-main)" }}
      >
        {label}
      </label>
      <span className="min-w-0 flex-1 block">
        {children(id)}
        {hint && (
          <span className="block text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            {hint}
          </span>
        )}
      </span>
    </div>
  );
}
