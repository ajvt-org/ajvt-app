"use client";

import Icon from "@/components/Icon";
import { formatDateTime, toThumbUrl } from "@/lib/utils";
import { STATUS_LABEL, STATUS_BADGE } from "./constants";
import type { Member } from "./types";

const AVATAR_BG: Record<Member["status"], string> = {
  ACTIVE: "var(--mint-600)",
  REJECTED: "#dc2626",
  PENDING: "var(--copper-500)",
};

function Avatar({ member }: { member: Member }) {
  if (member.photo) {
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={toThumbUrl(`/api/files/${member.photo}`)}
          alt={member.fullName}
          width={40}
          height={40}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-black text-white"
      style={{ background: AVATAR_BG[member.status] }}
    >
      <Icon name="user" size={20} />
    </div>
  );
}

function MemberRow({
  member,
  checked,
  onToggle,
  onOpen,
}: {
  member: Member;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="card w-full p-4 text-right transition-all hover:shadow-md cursor-pointer"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 shrink-0"
            aria-label={`تحديد ${member.fullName}`}
          />
          <Avatar member={member} />
          <div className="min-w-0">
            <p className="font-bold truncate" style={{ color: "var(--text-main)" }}>
              {member.fullName}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }} dir="ltr">
              {member.user?.phone || "غير معروف"}
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className={`badge ${STATUS_BADGE[member.status]}`}>
            {STATUS_LABEL[member.status]}
          </span>
          <span style={{ color: "var(--text-muted)" }}>›</span>
        </div>
      </div>
      <div
        className="flex gap-3 mt-2 text-xs"
        style={{ color: "var(--text-muted)", paddingRight: "52px" }}
      >
        <span>العصر: {member.age}</span>
        <span>•</span>
        <span>{member.paymentMethod}</span>
        <span>•</span>
        <span dir="ltr">{formatDateTime(member.createdAt)}</span>
      </div>
    </div>
  );
}

export default function MemberList({
  members,
  loading,
  empty,
  selectedIds,
  onToggle,
  onOpen,
}: {
  members: Member[];
  loading: boolean;
  empty: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (member: Member) => void;
}) {
  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: "var(--mint-500)" }}>
        <div className="text-4xl animate-pulse mb-3">⏳</div>
        <p className="text-sm font-semibold">جاري التحميل...</p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="card p-12 text-center" style={{ color: "var(--text-muted)" }}>
        <div className="text-4xl mb-3">📭</div>
        <p className="font-semibold">لا توجد طلبات في هذا القسم</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((m) => (
        <MemberRow
          key={m.id}
          member={m}
          checked={selectedIds.has(m.id)}
          onToggle={() => onToggle(m.id)}
          onOpen={() => onOpen(m)}
        />
      ))}
    </div>
  );
}
