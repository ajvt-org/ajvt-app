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
      className="page-header px-5 py-4 flex items-center gap-3 sticky top-0 z-20"
      style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
    >
      {backHref ? <BackButton href={backHref} /> : null}
      <Image src="/version-final.png" alt="شعار" width={38} height={38} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
          رابطة شباب قرية التاكلالت
        </p>
        <h1 key={title} className="page-header-title text-base font-black text-white truncate">
          {title}
        </h1>
      </div>
      {actions}
    </div>
  );
}
