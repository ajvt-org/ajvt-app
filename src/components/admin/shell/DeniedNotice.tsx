"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

export default function DeniedNotice({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="mx-4 mt-3 p-3 rounded-xl text-sm font-semibold flex items-center justify-between gap-2"
      style={{ background: "#fef3c7", color: "#92400e" }}
    >
      <span>
        <IconLabel name="lock">ليس لديك صلاحية للوصول إلى تلك الصفحة</IconLabel>
      </span>
      <button onClick={onDismiss} aria-label="إغلاق" className="flex items-center shrink-0">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
