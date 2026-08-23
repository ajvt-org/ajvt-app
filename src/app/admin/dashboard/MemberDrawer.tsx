"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ArrowLabel from "@/components/ArrowLabel";
import ProofReuseWarning from "@/components/admin/ProofReuseWarning";
import SamePersonWarning from "@/components/admin/SamePersonWarning";
import { formatDate, formatTime } from "@/lib/utils";
import { STATUS_LABEL, STATUS_BADGE, STATUS_ICON } from "./constants";
import MemberAccountCard from "./MemberAccountCard";
import MemberDecision from "./MemberDecision";
import type { Member } from "./types";
import MembershipPanel from "./MembershipPanel";

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="px-5 py-4 flex items-center justify-between"
      style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
    >
      <h2 className="font-black text-white text-lg">تفاصيل الطلب</h2>
      <button
        onClick={onClose}
        aria-label="إغلاق"
        className="w-8 h-8 rounded-full flex items-center justify-center text-white"
        style={{ background: "rgba(255,255,255,0.15)" }}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

function Identity({ member }: { member: Member }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="relative shrink-0">
        {member.photo ? (
          <div className="w-16 h-16 rounded-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/${member.photo}`}
              alt={member.fullName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white"
            style={{ background: "var(--mint-600)" }}
          >
            <Icon name="user" size={26} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-lg truncate" style={{ color: "var(--text-main)" }}>
          {member.fullName}
        </p>
      </div>
      <Link
        href={`/admin/members/${member.id}`}
        className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        <IconLabel name="pencil">تعديل</IconLabel>
      </Link>
    </div>
  );
}

type Row = [string, string, string | undefined];

function paidRows(member: Member): Row[] {
  const fee = member.paidAmount ?? 0;
  if (member.supportAmount <= 0) {
    return [["المبلغ المسدد", member.paidAmount ? `${fee} أوقية` : "—", undefined]];
  }
  return [
    ["رسوم الاشتراك", `${fee} أوقية`, undefined],
    ["مبلغ الدعم", `${member.supportAmount} أوقية`, undefined],
    ["إجمالي ما دُفع", `${fee + member.supportAmount} أوقية`, undefined],
  ];
}

function Facts({ member, settingsYear }: { member: Member; settingsYear: number }) {
  const rows: Row[] = [
    ["رقم الهاتف", member.user?.phone || "غير معروف", "ltr"],
    ["العصر", member.age, undefined],
    ["طريقة الدفع", member.paymentMethod, undefined],
    ["سنة العضوية", String(member.membershipYear), "ltr"],
    ...paidRows(member),
    ["رقم العضوية", member.memberNumber || "—", "ltr"],
    ["تاريخ الطلب", formatDate(member.createdAt), undefined],
    ["وقت الطلب", formatTime(member.createdAt), "ltr"],
  ];

  return (
    <div className="card p-4 space-y-3">
      {rows.map(([label, value, dir]) => (
        <div key={label} className="flex items-center justify-between gap-3">
          <span className="text-sm shrink-0" style={{ color: "var(--text-muted)" }}>
            {label}
          </span>
          <span className="text-sm font-bold" style={{ color: "var(--text-main)" }} dir={dir}>
            {value}
          </span>
        </div>
      ))}
      {member.status === "ACTIVE" && member.membershipYear < settingsYear && (
        <p
          className="text-xs font-bold rounded-lg px-3 py-2"
          style={{ background: "#fef3c7", color: "#92400e" }}
        >
          المبالغ أعلاه تخص عضوية {member.membershipYear}، ولم يجدد عضوية {settingsYear} بعد.
        </p>
      )}
    </div>
  );
}

function Proof({ member, onZoom }: { member: Member; onZoom: () => void }) {
  return (
    <div>
      <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
        <IconLabel name="camera">صورة الكابتير</IconLabel>
      </p>
      {member.paymentProof ? (
        <>
          <div
            className="rounded-2xl overflow-hidden cursor-zoom-in border-2"
            style={{ borderColor: "var(--mint-300)" }}
            onClick={onZoom}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/${member.paymentProof}`}
              alt="كابتير"
              className="w-full object-contain max-h-56"
              style={{ background: "#f3f4f6" }}
            />
          </div>
          <p className="text-xs text-center mt-1" style={{ color: "var(--text-muted)" }}>
            انقر للتكبير
          </p>
          <ProofReuseWarning filename={member.paymentProof} kind="member" id={member.id} />
        </>
      ) : (
        <p className="text-sm card p-3 text-center" style={{ color: "var(--text-muted)" }}>
          أُضيف يدوياً من طرف المشرف — لا يوجد إثبات دفع
        </p>
      )}
    </div>
  );
}

export interface MemberDrawerProps {
  member: Member;
  actionLoading: boolean;
  settingsYear: number;
  resetLoading: boolean;
  tempPassword: string | null;
  tempPasswordHours: number;
  accountPhone: string;
  attachLoading: boolean;
  attachError: string;
  showRejectPicker: boolean;
  rejectReason: string;
  onClose: () => void;
  onZoomProof: () => void;
  onResetPassword: () => void;
  onAccountPhone: (phone: string) => void;
  onAttachAccount: () => void;
  onRejectReason: (reason: string) => void;
  onOpenRejectPicker: () => void;
  onCloseRejectPicker: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export default function MemberDrawer({
  member,
  actionLoading,
  settingsYear,
  resetLoading,
  tempPassword,
  tempPasswordHours,
  accountPhone,
  attachLoading,
  attachError,
  showRejectPicker,
  rejectReason,
  onClose,
  onZoomProof,
  onResetPassword,
  onAccountPhone,
  onAttachAccount,
  onRejectReason,
  onOpenRejectPicker,
  onCloseRejectPicker,
  onApprove,
  onReject,
}: MemberDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl md:rounded-2xl overflow-y-auto"
        style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--mint-300)" }} />
        </div>

        <Header onClose={onClose} />

        <div className="p-5 space-y-4">
          <SamePersonWarning memberId={member.id} />
          <Identity member={member} />
          <Facts member={member} settingsYear={settingsYear} />
          <MembershipPanel memberId={member.id} />

          <div className="flex items-center justify-between card p-4">
            <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
              الحالة
            </span>
            <span className={`badge ${STATUS_BADGE[member.status]}`}>
              <IconLabel name={STATUS_ICON[member.status]}>{STATUS_LABEL[member.status]}</IconLabel>
            </span>
          </div>

          {member.registrations && member.registrations.length > 0 && (
            <div className="card p-4">
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                الأنشطة المسجل بها
              </p>
              <div className="flex flex-wrap gap-1.5">
                {member.registrations.map((r) => (
                  <span key={r.activityId} className="badge badge-active">
                    {r.activity.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <MemberAccountCard
            hasAccount={!!member.userId}
            resetLoading={resetLoading}
            tempPassword={tempPassword}
            tempPasswordHours={tempPasswordHours}
            phone={accountPhone}
            attachLoading={attachLoading}
            attachError={attachError}
            onReset={onResetPassword}
            onPhone={onAccountPhone}
            onAttach={onAttachAccount}
          />

          <Link
            href={`/admin/members/${member.id}`}
            className="text-xs font-bold block"
            style={{ color: "var(--mint-600)" }}
          >
            <ArrowLabel>الملف الكامل للعضو</ArrowLabel>
          </Link>

          <Proof member={member} onZoom={onZoomProof} />

          <MemberDecision
            member={member}
            loading={actionLoading}
            showRejectPicker={showRejectPicker}
            rejectReason={rejectReason}
            onRejectReason={onRejectReason}
            onOpenRejectPicker={onOpenRejectPicker}
            onCloseRejectPicker={onCloseRejectPicker}
            onApprove={onApprove}
            onReject={onReject}
          />

          <div className="pb-2" />
        </div>
      </div>
    </div>
  );
}
