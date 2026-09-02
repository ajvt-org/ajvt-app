"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginPathWithNext, toThumbUrl } from "@/lib/utils";
import { auditActionLabel } from "@/lib/auditLabels";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ArrowLabel from "@/components/ArrowLabel";
import ProofReuseWarning from "@/components/admin/ProofReuseWarning";
import MemberProofForm from "@/components/admin/MemberProofForm";
import SamePersonWarning from "@/components/admin/SamePersonWarning";
import ProfileSection from "@/components/admin/ProfileSection";
import PaymentReceipts from "@/components/PaymentReceipts";
import MemberEditForm from "./MemberEditForm";
import MemberDecision from "./MemberDecision";
import DeleteMemberCard from "./DeleteMemberCard";
import AccountPhoneForm from "./AccountPhoneForm";
import MemberPhotoCard from "./MemberPhotoCard";
import SupportPrivacyCard from "./SupportPrivacyCard";
import type { MemberProfile } from "@/components/admin/profileTypes";
import { memberStatusLabels } from "@/lib/messages";
import { memberPage as texts, ouguiya, registrationStatusLabels } from "@/lib/texts";

const MEMBER_STATUS: Record<string, string> = memberStatusLabels;

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
        {texts.loading}
      </p>
    );
  }

  if (missing || !data) {
    return (
      <div className="admin-page text-center py-16 space-y-3">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {texts.notFound}
        </p>
        <Link
          href="/admin/dashboard"
          className="text-sm font-bold"
          style={{ color: "var(--mint-600)" }}
        >
          <ArrowLabel direction="back">{texts.backToMembers}</ArrowLabel>
        </Link>
      </div>
    );
  }

  const { member, supportPrivacy, history } = data;

  return (
    <div className="admin-page space-y-4">
      <Link
        href="/admin/dashboard"
        className="text-sm font-bold"
        style={{ color: "var(--mint-600)" }}
      >
        <ArrowLabel direction="back">{texts.backToMembers}</ArrowLabel>
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
            <span dir="ltr">{member.user?.phone || "—"}</span> · {member.village}
            {member.age ? ` · ${member.age}` : ""}
            {member.memberNumber ? ` · ${member.memberNumber}` : ""}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs font-bold">{MEMBER_STATUS[member.status]}</span>
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            {editing ? texts.cancel : <IconLabel name="pencil">{texts.edit}</IconLabel>}
          </button>
        </div>
      </div>

      <SamePersonWarning memberId={member.id} />

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

      {member.user && (
        <ProfileSection icon="user" title={texts.account}>
          <div className="text-sm">
            <AccountPhoneForm memberId={member.id} phone={member.user.phone} onChanged={load} />
          </div>
        </ProfileSection>
      )}

      <MemberPhotoCard
        memberId={member.id}
        photo={member.photo}
        locked={member.photoLocked}
        onChanged={load}
      />

      {supportPrivacy && (
        <SupportPrivacyCard
          memberId={member.id}
          confidential={supportPrivacy.confidential}
          namedEntries={supportPrivacy.namedEntries}
          onChanged={load}
        />
      )}

      <ProfileSection icon="wallet" title={texts.payment}>
        <dl className="text-sm space-y-1">
          <div className="flex justify-between gap-3">
            <dt style={{ color: "var(--text-muted)" }}>{texts.paidAmount}</dt>
            <dd className="font-bold">{member.paidAmount ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt style={{ color: "var(--text-muted)" }}>{texts.method}</dt>
            <dd className="font-bold">{member.paymentMethod || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt style={{ color: "var(--text-muted)" }}>{texts.requestDate}</dt>
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
              alt={texts.proofAlt}
              className="w-full object-contain max-h-56 rounded-xl"
              style={{ background: "#f3f4f6" }}
            />
            <ProofReuseWarning filename={member.paymentProof} kind="member" id={member.id} />
          </div>
        )}
        <div className="mt-3">
          <MemberProofForm memberId={member.id} proof={member.paymentProof} onSaved={load} />
        </div>
      </ProfileSection>

      <ProfileSection icon="trophy" title={texts.activities(member.registrations.length)}>
        {member.registrations.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {texts.noActivities}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {member.registrations.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{r.activity.title}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {registrationStatusLabels[r.status] ?? r.status} ·{" "}
                  <span dir="ltr">{day(r.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>

      <ProfileSection icon="users" title={texts.teams(member.teamMemberships.length)}>
        {member.teamMemberships.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {texts.noTeams}
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

      <ProfileSection icon="heart" title={texts.donations(member.donations.length)}>
        {member.donations.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {texts.noDonations}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {member.donations.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-bold">
                  {d.amount !== null ? ouguiya.amount(d.amount) : "—"}
                </span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {d.paymentMethod || d.source} · <span dir="ltr">{day(d.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>

      <PaymentReceipts source={`/api/admin/members/${member.id}/receipts`} />

      <ProfileSection icon="list" title={texts.history(history.length)}>
        {history.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {texts.noHistory}
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

      <DeleteMemberCard
        memberId={member.id}
        userId={member.user?.id ?? null}
        fullName={member.fullName}
      />
    </div>
  );
}
