"use client";

export default function FormField({
  id,
  label,
  compact = false,
  className,
  children,
}: {
  id: string;
  label: string;
  compact?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className ?? (compact ? "space-y-1" : undefined)}>
      <label
        htmlFor={id}
        className={compact ? "block text-[11px] font-bold" : "block text-sm font-bold mb-1.5"}
        style={{ color: compact ? "var(--text-muted)" : "var(--text-main)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
