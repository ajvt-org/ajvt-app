import HeaderIdentity from "./HeaderIdentity";

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
      <HeaderIdentity title={title} backHref={backHref} />
      {actions}
    </div>
  );
}
