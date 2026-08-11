"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <div className="app-shell">
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <Image src="/version-final.png" alt="شعار" width={40} height={40} />
        <div>
          <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
            رابطة شباب قرية التاكلالت
          </p>
          <h1 className="text-base font-black text-white">الصفحة غير موجودة</h1>
        </div>
      </div>

      <div className="flex-1 px-5 py-10 flex flex-col items-center justify-center text-center space-y-4">
        <p className="text-5xl">🔍</p>
        <p className="font-bold text-lg" style={{ color: "var(--text-main)" }}>لم نجد هذه الصفحة</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          الرابط الذي فتحته غير صحيح أو تم حذف الصفحة.
        </p>
        <Link href={isAdmin ? "/admin/dashboard" : "/"} className="btn btn-primary mt-2" style={{ width: "auto", paddingInline: "2rem" }}>
          {isAdmin ? "← لوحة التحكم" : "← الصفحة الرئيسية"}
        </Link>
      </div>
    </div>
  );
}
