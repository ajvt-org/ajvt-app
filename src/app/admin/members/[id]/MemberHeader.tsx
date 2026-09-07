"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { toThumbUrl } from "@/lib/utils";
import { memberStatusLabels } from "@/lib/messages";
import { memberPage as texts } from "@/lib/texts";

const MEMBER_STATUS: Record<string, string> = memberStatusLabels;

export default function MemberHeader({
  fullName,
  photo,
  phone,
  village,
  age,
  memberNumber,
  status,
  editing,
  onToggleEdit,
}: {
  fullName: string;
  photo: string | null;
  phone: string | null;
  village: string;
  age: string | null;
  memberNumber: string | null;
  status: string;
  editing: boolean;
  onToggleEdit: () => void;
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      {photo ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={toThumbUrl(`/api/files/${photo}`)}
          alt={fullName}
          className="w-14 h-14 rounded-full object-cover shrink-0"
        />
      ) : (
        <span
          className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--mint-100)" }}
        >
          <Icon name="user" size={24} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-black text-base" style={{ color: "var(--text-main)" }}>
          {fullName}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          <span dir="ltr">{phone || "—"}</span> · {village}
          {age ? ` · ${age}` : ""}
          {memberNumber ? ` · ${memberNumber}` : ""}
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <span className="text-xs font-bold">{MEMBER_STATUS[status]}</span>
        <button
          onClick={onToggleEdit}
          className="text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          {editing ? texts.cancel : <IconLabel name="pencil">{texts.edit}</IconLabel>}
        </button>
      </div>
    </div>
  );
}
