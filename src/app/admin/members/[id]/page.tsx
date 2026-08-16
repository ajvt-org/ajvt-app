"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memberPhone } from "@/lib/memberPhone";
import { loginPathWithNext, toThumbUrl } from "@/lib/utils";
import { auditActionLabel } from "@/lib/auditLabels";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ArrowLabel from "@/components/ArrowLabel";
import ProofReuseWarning from "@/components/admin/ProofReuseWarning";
import ProfileSection from "@/components/admin/ProfileSection";
import MemberEditForm from "./MemberEditForm";
import MemberDecision from "./MemberDecision";
import type { MemberProfile } from "@/components/admin/profileTypes";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "قيد الانتظار",
  ACTIVE: "مقبول",
  REJECTED: "مرفوض",
};

function day(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toISOString().slice(0, 10);
}

export default function AdminMemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<MemberProfile | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  function load() {
    return fetch(`/api/admin/members/${id}/profile`)
      .then((r) => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        if (r.status === 404) {
          setMissing(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  if (loading) {
    return (
      <p className="admin-page text-sm text-center py-16" style={{ color: "var(--mint-500)" }}>
        جاري التحميل...
      </p>
    );
  }

  if (missing || !data) {
    return (
      <div className="admin-page text-center py-16 space-y-3">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          لم نجد هذا العضو.
        </p>
        <Link
          href="/admin/dashboard"
          className="text-sm font-bold"
          style={{ color: "var(--mint-600)" }}
        >
          <ArrowLabel direction="back">الأعضاء</ArrowLabel>
        </Link>
      </div>
    );
  }

  const { member, history } = data;

  return (
    <div className="admin-page space-y-4">
      <Link
        href="/admin/dashboard"
        className="text-sm font-bold"
        style={{ color: "var(--mint-600)" }}
      >
        <ArrowLabel direction="back">الأعضاء</ArrowLabel>
      </Link>

      <div className="card p-4 flex items-center gap-3">
        {member.photo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={toThumbUrl(`/api/files/${member.photo}`)}
            alt={member.fullName}
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
            {member.fullName}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            <span dir="ltr">{memberPhone(member) || "—"}</span> · {member.age}
            {member.memberNumber ? ` · ${member.memberNumber}` : ""}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs font-bold">{STATUS_LABEL[member.status]}</span>
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            {editing ? "إلغاء" : <IconLabel name="pencil">تعديل</IconLabel>}
          </button>
        </div>
      </div>

      {editing ? (
        <MemberEditForm
          member={member}
          onSaved={() => {
            setEditing(false);
            load();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <MemberDecision memberId={member.id} status={member.status} onDecided={load} />
      )}

      <ProfileSection icon="wallet" title="الدفع">
        <dl className="text-sm space-y-1">
          <div className="flex justify-between gap-3">
            <dt style={{ color: "var(--text-muted)" }}>المبلغ المدفوع</dt>
            <dd className="font-bold">{member.paidAmount ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt style={{ color: "var(--text-muted)" }}>طريقة الدفع</dt>
            <dd className="font-bold">{member.paymentMethod || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt style={{ color: "var(--text-muted)" }}>تاريخ الطلب</dt>
            <dd className="font-bold" dir="ltr">
              {day(member.createdAt)}
            </dd>
          </div>
        </dl>
        {member.paymentProof && (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/${member.paymentProof}`}
              alt="كابتير"
              className="w-full object-contain max-h-56 rounded-xl"
              style={{ background: "#f3f4f6" }}
            />
            <ProofReuseWarning filename={member.paymentProof} kind="member" id={member.id} />
          </div>
        )}
      </ProfileSection>

      <ProfileSection icon="trophy" title={`الأنشطة (${member.registrations.length})`}>
        {member.registrations.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لم يشارك في أي نشاط
          </p>
        ) : (
          <ul className="space-y-1.5">
            {member.registrations.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{r.activity.title}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {STATUS_LABEL[r.status] ?? r.status} · <span dir="ltr">{day(r.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>

      <ProfileSection icon="users" title={`الفرق (${member.teamMemberships.length})`}>
        {member.teamMemberships.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            ليس في أي فريق
          </p>
        ) : (
          <ul className="space-y-1.5">
            {member.teamMemberships.map((t) => (
              <li key={t.team.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{t.team.name}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {t.team.activity.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>

      <ProfileSection icon="heart" title={`التبرعات (${member.donations.length})`}>
        {member.donations.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لا توجد تبرعات
          </p>
        ) : (
          <ul className="space-y-1.5">
            {member.donations.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-bold">{d.amount} أوقية</span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {d.paymentMethod || d.source} · <span dir="ltr">{day(d.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>

      {/* The trail was already written on every change; nothing could read a
          single record's share of it until now. */}
      <ProfileSection icon="list" title={`سجل التغييرات (${history.length})`}>
        {history.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لا توجد تغييرات مسجلة
          </p>
        ) : (
          <ul className="space-y-1.5">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <IconLabel name="pencil">{auditActionLabel(h.action)}</IconLabel>
                </span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {h.adminUsername} · <span dir="ltr">{day(h.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>
    </div>
  );
}
