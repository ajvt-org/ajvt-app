import BackButton from "./BackButton";
import Logo from "./Logo";
import { association } from "@/lib/texts";

export default function HeaderIdentity({
  title,
  backHref,
  large,
}: {
  title: string;
  backHref?: string;
  large?: boolean;
}) {
  return (
    <>
      {backHref ? <BackButton href={backHref} /> : null}
      <Logo mark="symbol" size={38} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
          {association.name}
        </p>
        <h1
          key={title}
          className={`page-header-title font-black text-white truncate ${large ? "text-lg" : "text-base"}`}
        >
          {title}
        </h1>
      </div>
    </>
  );
}
