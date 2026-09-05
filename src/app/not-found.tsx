"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import ArrowLabel from "@/components/ArrowLabel";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import { pageTitles } from "@/lib/texts";

export default function NotFound() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <div className="app-shell">
      <PageHeader title={pageTitles.notFound} />

      <div className="flex-1 px-5 py-10 flex flex-col items-center justify-center text-center space-y-4">
        <p style={{ color: "var(--mint-500)" }}>
          <Icon name="search" size={48} />
        </p>
        <p className="font-bold text-lg" style={{ color: "var(--text-main)" }}>
          لم نجد هذه الصفحة
        </p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          الرابط الذي فتحته غير صحيح أو تم حذف الصفحة.
        </p>
        <Link
          href={isAdmin ? "/admin/dashboard" : "/"}
          className="btn btn-primary mt-2"
          style={{ width: "auto", paddingInline: "2rem" }}
        >
          <ArrowLabel direction="back">{isAdmin ? "لوحة التحكم" : "الصفحة الرئيسية"}</ArrowLabel>
        </Link>
      </div>
    </div>
  );
}
