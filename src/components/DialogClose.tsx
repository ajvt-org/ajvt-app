import Icon from "./Icon";

export default function DialogClose({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="إغلاق"
      className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
      style={{ background: "rgba(255,255,255,0.15)" }}
    >
      <Icon name="close" size={16} />
    </button>
  );
}
