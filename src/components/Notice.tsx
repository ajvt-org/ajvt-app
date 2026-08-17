import IconLabel from "./IconLabel";

const TONES = {
  error: { background: "#fee2e2", color: "#991b1b", icon: "warning" },
  success: { background: "#d1fae5", color: "#065f46", icon: "check" },
} as const;

export default function Notice({
  tone,
  children,
}: {
  tone: keyof typeof TONES;
  children: React.ReactNode;
}) {
  const { icon, ...style } = TONES[tone];
  return (
    <div className="p-3 rounded-xl text-sm font-semibold" style={style}>
      <IconLabel name={icon}>{children}</IconLabel>
    </div>
  );
}
