export default function CardChip({ type, count }: { type: "YELLOW" | "RED"; count?: number }) {
  const yellow = type === "YELLOW";
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {count !== undefined && count}
      <span
        role="img"
        aria-label={yellow ? "بطاقة صفراء" : "بطاقة حمراء"}
        style={{
          display: "inline-block",
          width: "0.62em",
          height: "0.88em",
          borderRadius: "2px",
          background: yellow ? "#facc15" : "#dc2626",
        }}
      />
    </span>
  );
}
