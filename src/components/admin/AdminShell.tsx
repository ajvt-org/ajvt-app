"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import { canOpen, landingFor } from "@/lib/adminNav";
import { NAV_TABS } from "./shell/navTabs";
import { useAdminSession } from "./shell/useAdminSession";
import { useDeniedNotice } from "./shell/useDeniedNotice";
import TopBar from "./shell/TopBar";
import TabStrip from "./shell/TabStrip";
import DeniedNotice from "./shell/DeniedNotice";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = !!pathname?.startsWith("/admin/login");

  const { role, pending } = useAdminSession(!isLoginPage);
  const { denied, dismiss } = useDeniedNotice();

  useEffect(() => {
    if (!role || isLoginPage || !pathname) return;
    if (canOpen(role, pathname)) return;
    const landing = landingFor(role);
    if (landing) router.push(`${landing}?denied=1`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, pathname, isLoginPage]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  useInactivityLogout(IDLE_TIMEOUT_MS, logout, !isLoginPage);

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="min-h-screen" style={{ background: "var(--mint-50)", direction: "rtl" }}>
      <div className="sticky top-0 z-30">
        <TopBar onLogout={logout} />
        <TabStrip
          tabs={NAV_TABS.filter((tab) => canOpen(role, tab.href))}
          pathname={pathname}
          pending={pending}
          onOpen={(href) => router.push(href)}
        />
      </div>

      {denied && <DeniedNotice onDismiss={dismiss} />}

      {children}
    </div>
  );
}
