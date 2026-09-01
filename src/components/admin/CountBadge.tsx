const RED = "#dc2626";
const MAX = 9;

export default function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span
      dir="ltr"
      className="absolute -top-1.5 -end-1.5 rounded-full text-white font-black flex items-center justify-center"
      style={{
        background: RED,
        fontSize: "9px",
        minWidth: "16px",
        height: "16px",
        padding: "0 3px",
      }}
    >
      <span className="badge-numeral">{count > MAX ? `+${MAX}` : count}</span>
    </span>
  );
}
