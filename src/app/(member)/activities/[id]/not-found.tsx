import PageHeader from "@/components/PageHeader";
import { activityPage as texts } from "@/lib/texts";

export default function ActivityNotFound() {
  return (
    <div className="app-shell">
      <PageHeader title={texts.pageTitle} backHref="/activities" />
      <div className="px-5 py-10 text-center space-y-3">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {texts.notFound}
        </p>
      </div>
    </div>
  );
}
