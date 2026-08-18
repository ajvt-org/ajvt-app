"use client";

import Image from "next/image";
import IconLabel from "@/components/IconLabel";

export default function TopBar({ onLogout }: { onLogout: () => void }) {
  return (
    <div
      className="px-4 py-3 flex items-center justify-between"
      style={{
        background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))",
        boxShadow: "0 2px 12px rgba(26,63,51,0.2)",
      }}
    >
      <div className="flex items-center gap-3">
        <Image src="/version-final.png" alt="شعار" width={36} height={36} />
        <p className="text-sm font-black text-white leading-none">لوحة تحكم المشرف</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onLogout}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
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
