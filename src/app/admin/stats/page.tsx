"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WorkspaceTabs, { type WorkspaceSection } from "@/components/admin/WorkspaceTabs";
import { dataPage as texts } from "@/lib/texts";
import DataExport from "./DataExport";
import VisitsPanel from "./VisitsPanel";

const SECTIONS: WorkspaceSection[] = [
  {
    key: "data",
    label: texts.visitsTab,
    tabs: [
      { key: "visits", label: texts.visitsTab, icon: "chart" },
      { key: "export", label: texts.exportTab, icon: "download" },
    ],
  },
];

const TABS = SECTIONS[0].tabs;

function AdminDataPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requested = searchParams.get("tab") || TABS[0].key;
  const tab = TABS.some((t) => t.key === requested) ? requested : TABS[0].key;

  function pickTab(key: string) {
    router.replace(`/admin/stats?tab=${key}`, { scroll: false });
  }

  return (
    <div className="admin-page space-y-4">
      <WorkspaceTabs sections={SECTIONS} active={tab} onPick={pickTab} />

      {tab === "visits" && <VisitsPanel />}
      {tab === "export" && <DataExport />}
    </div>
  );
}

export default function AdminDataPage() {
  return (
    <Suspense fallback={null}>
      <AdminDataPageInner />
    </Suspense>
  );
}
