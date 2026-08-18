"use client";

import Image from "next/image";
import IconLabel from "@/components/IconLabel";

export default function TopBar({ onLogout }: { onLogout: () => void }) {
  return (
    <div
      className="px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between"
      style={{
        background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))",
        boxShadow: "0 2px 12px rgba(26,63,51,0.2)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Image src="/version-final.png" alt="شعار" width={30} height={30} className="shrink-0" />
        <p className="text-xs sm:text-sm font-black text-white leading-none">لوحة تحكم المشرف</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onLogout}
          className="text-xs px-2.5 py-1 rounded-lg font-semibold shrink-0"
          style={{
            background: "rgba(239,68,68,0.2)",
            color: "#fca5a5",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <IconLabel name="logout">خروج</IconLabel>
        </button>
      </div>
    </div>
  );
}
