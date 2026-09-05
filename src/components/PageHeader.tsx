import BackButton from "./BackButton";
import Logo from "./Logo";
import { association } from "@/lib/texts";

export default function PageHeader({
  title,
  backHref,
  onBack,
  actions,
}: {
  title: string;
  backHref?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="page-header px-5 py-4 flex items-center gap-3 sticky top-0 z-20"
      style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
    >
      {onBack || backHref ? <BackButton href={backHref} onBack={onBack} /> : null}
      <Logo mark="symbol" size={38} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
          {association.name}
        </p>
        <h1 key={title} className="page-header-title text-base font-black text-white truncate">
          {title}
        </h1>
      </div>
      {actions}
    </div>
  );
}
