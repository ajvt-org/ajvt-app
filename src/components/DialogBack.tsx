import Icon from "./Icon";

export default function DialogBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="رجوع"
      className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
      style={{ background: "rgba(255,255,255,0.15)" }}
    >
      <Icon name="chevronRight" size={18} />
    </button>
  );
}
