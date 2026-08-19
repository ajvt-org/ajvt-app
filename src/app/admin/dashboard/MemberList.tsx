"use client";

import Icon from "@/components/Icon";
import AdminList, { type AdminListPagination } from "@/components/admin/AdminList";
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
      className="card w-full p-3 sm:p-4 text-right transition-all hover:shadow-md cursor-pointer"
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
  selectedIds,
  onToggle,
  onOpen,
  pagination,
}: {
  members: Member[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (member: Member) => void;
  pagination?: AdminListPagination;
}) {
  return (
    <AdminList
      items={members}
      getKey={(m) => m.id}
      renderRow={(m) => (
        <MemberRow
          member={m}
          checked={selectedIds.has(m.id)}
          onToggle={() => onToggle(m.id)}
          onOpen={() => onOpen(m)}
        />
      )}
      emptyMessage="لا توجد طلبات في هذا القسم"
      pagination={pagination}
    />
  );
}
