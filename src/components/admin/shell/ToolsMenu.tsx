"use client";

import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import Sheet from "@/components/Sheet";
import type { IconName } from "@/components/Icon";
import type { Panel } from "./panels";

const ITEMS: { panel: Panel; label: string; icon: IconName; superOnly: boolean }[] = [
  { panel: "password", label: "تغيير كلمة المرور", icon: "key", superOnly: false },
  { panel: "accounts", label: "إدارة حسابات المشرفين", icon: "users", superOnly: true },
  { panel: "audit", label: "سجل الإجراءات", icon: "list", superOnly: false },
  { panel: "broadcast", label: "إرسال إشعار جماعي", icon: "megaphone", superOnly: true },
];

export default function ToolsMenu({
  role,
  onPick,
  onClose,
}: {
  role: string | null;
  onPick: (panel: Panel) => void;
  onClose: () => void;
}) {
  const items = ITEMS.filter((item) => !item.superOnly || role === "SUPER");

  return (
    <Sheet size="sm" onClose={onClose}>
      <div className="flex justify-center pt-3 pb-1 md:hidden">
        <div className="w-10 h-1 rounded-full" style={{ background: "var(--mint-300)" }} />
      </div>
      <DialogHeader title="أدوات المشرف" sticky={false} onClose={onClose} />
      <div className="p-4 space-y-2">
        {items.map((item) => (
          <button
            key={item.panel}
            onClick={() => onPick(item.panel)}
            className="w-full text-right p-3 rounded-xl font-semibold text-sm card"
          >
            <IconLabel name={item.icon}>{item.label}</IconLabel>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
