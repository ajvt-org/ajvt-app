import LocalMoment from "@/components/LocalMoment";

export function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="block text-xs font-bold mb-1"
        style={{ color: "var(--text-main)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>
        {label}
      </p>
      <p
        className="text-sm font-bold"
        style={{ color: "var(--text-main)", overflowWrap: "anywhere" }}
      >
        {value}
      </p>
    </div>
  );
}

export function Moment({ label, at }: { label: string; at: string | Date }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>
        {label}
      </p>
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <LocalMoment at={at} />
      </p>
    </div>
  );
}
