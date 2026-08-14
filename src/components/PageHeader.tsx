import Image from "next/image";
import BackButton from "./BackButton";

export default function PageHeader({
  title,
  backHref,
  actions,
}: {
  title: string;
  backHref?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="px-5 py-4 flex items-center gap-3"
      style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
    >
      {backHref ? <BackButton fallbackHref={backHref} /> : null}
      <Image src="/version-final.png" alt="شعار" width={38} height={38} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
          رابطة شباب قرية التاكلالت
        </p>
        <h1 className="text-base font-black text-white truncate">{title}</h1>
      </div>
      {actions}
    </div>
  );
}
