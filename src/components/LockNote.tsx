import IconLabel from "./IconLabel";

export default function LockNote({ children }: { children: string }) {
  return (
    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
      <IconLabel name="lock" size={11}>
        {children}
      </IconLabel>
    </p>
  );
}
