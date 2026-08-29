"use client";

import Icon from "@/components/Icon";
import AdminList, { type AdminListPagination } from "@/components/admin/AdminList";
import InlineName from "./InlineName";
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
  onRenamed,
}: {
  member: Member;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onRenamed: (fullName: string) => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="card w-full p-3 sm:p-4 text-right transition-all hover:shadow-md cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 shrink-0"
          aria-label={`تحديد ${member.fullName}`}
        />
        <Avatar member={member} />
        <div className="min-w-0 flex-1">
          <InlineName memberId={member.id} fullName={member.fullName} onRenamed={onRenamed} />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }} dir="ltr">
            {member.user?.phone || "غير معروف"}
          </p>
        </div>
        <span
          className="w-6 h-6 flex items-center justify-center shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          <Icon name="chevronLeft" size={15} />
        </span>
      </div>
      <div
        className="flex items-center gap-2 flex-wrap mt-2 text-xs"
        style={{ color: "var(--text-muted)", paddingRight: "52px" }}
      >
        <span className={`badge ${STATUS_BADGE[member.status]}`}>
          {STATUS_LABEL[member.status]}
        </span>
        <span>{member.age ? `العصر: ${member.age}` : `القرية: ${member.village}`}</span>
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
  onRenamed,
  pagination,
}: {
  members: Member[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (member: Member) => void;
  onRenamed: (id: string, fullName: string) => void;
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
          onRenamed={(fullName) => onRenamed(m.id, fullName)}
        />
      )}
      emptyMessage="لا توجد طلبات في هذا القسم"
      pagination={pagination}
    />
  );
}
