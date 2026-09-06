"use client";

import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import { notFoundPage, pageTitles } from "@/lib/texts";

export default function NotFound() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <div className="app-shell">
      <PageHeader title={pageTitles.notFound} backHref={isAdmin ? "/admin/dashboard" : "/"} />

      <div className="flex-1 px-5 py-10 flex flex-col items-center justify-center text-center space-y-4">
        <p style={{ color: "var(--mint-500)" }}>
          <Icon name="search" size={48} />
        </p>
        <p className="font-bold text-lg" style={{ color: "var(--text-main)" }}>
          {notFoundPage.heading}
        </p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {notFoundPage.note}
        </p>
      </div>
    </div>
  );
}
