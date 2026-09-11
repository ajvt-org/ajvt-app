export default function InfoRow({
  label,
  value,
  dir,
}: {
  label: string;
  value: React.ReactNode;
  dir?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: "var(--text-main)" }} dir={dir}>
        {value}
      </span>
    </div>
  );
}
