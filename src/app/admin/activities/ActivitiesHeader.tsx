"use client";

import Link from "next/link";
import IconLabel from "@/components/IconLabel";
import { activityRow as texts } from "@/lib/texts";

export default function ActivitiesHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/admin/activities/order"
        className="btn btn-sm text-xs font-bold"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        <IconLabel name="list">{texts.arrangeLink}</IconLabel>
      </Link>
      <span className="flex-1" />
      <button onClick={onAdd} className="btn btn-primary btn-sm text-xs">
        <IconLabel name="plus">{texts.add}</IconLabel>
      </button>
    </div>
  );
}
