"use client";

import IconLabel from "@/components/IconLabel";

export default function MemberSearch({
  value,
  onChange,
  onManageAgeGroups,
  onManualAdd,
}: {
  value: string;
  onChange: (q: string) => void;
  onManageAgeGroups: () => void;
  onManualAdd: () => void;
}) {
  return (
    <div className="flex gap-2 mb-4">
      <input
        type="text"
        placeholder="بحث بالاسم أو الهاتف أو رمز الطلب..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input flex-1"
        style={{ background: "white" }}
      />
      <button
        onClick={onManageAgeGroups}
        className="text-sm font-bold px-4 rounded-xl"
        style={{
          background: "white",
          color: "var(--mint-700)",
          border: "1px solid var(--mint-100)",
        }}
      >
        <IconLabel name="tag">الأعصار</IconLabel>
      </button>
      <button
        onClick={onManualAdd}
        className="btn btn-primary text-sm px-4"
        style={{ width: "auto" }}
      >
        <IconLabel name="plus">إضافة عضو يدوياً</IconLabel>
      </button>
    </div>
  );
}
