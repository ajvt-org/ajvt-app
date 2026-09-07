"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DataExport from "./DataExport";
import PaymentMethodManager from "@/components/admin/PaymentMethodManager";
import SettingsForm from "./SettingsForm";
import WorkspaceTabs, { type WorkspaceSection } from "@/components/admin/WorkspaceTabs";
import { paymentMethodManager, settingsPage } from "@/lib/texts";

const SECTIONS: WorkspaceSection[] = [
  {
    key: "settings",
    label: settingsPage.settingsTab,
    tabs: [
      { key: "settings", label: settingsPage.settingsTab, icon: "gear" },
      { key: "methods", label: paymentMethodManager.title, icon: "card" },
      { key: "export", label: settingsPage.exportTab, icon: "download" },
    ],
  },
];

const TABS = SECTIONS[0].tabs;

function AdminSettingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requested = searchParams.get("tab") || TABS[0].key;
  const tab = TABS.some((t) => t.key === requested) ? requested : TABS[0].key;

  function pickTab(key: string) {
    router.replace(`/admin/settings?tab=${key}`, { scroll: false });
  }

  return (
    <div className="admin-page space-y-4">
      <WorkspaceTabs sections={SECTIONS} active={tab} onPick={pickTab} />

      {tab === "settings" && <SettingsForm />}
      {tab === "methods" && <PaymentMethodManager />}
      {tab === "export" && <DataExport />}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={null}>
      <AdminSettingsPageInner />
    </Suspense>
  );
}
