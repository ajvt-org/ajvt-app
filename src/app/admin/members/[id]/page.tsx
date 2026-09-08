"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import { adminBackLink } from "@/lib/adminBackLink";
import { auditActionLabel } from "@/lib/auditLabels";
import IconLabel from "@/components/IconLabel";
import AdminBackLink from "@/components/admin/AdminBackLink";
import SamePersonWarning from "@/components/admin/SamePersonWarning";
import PaymentReceipts from "@/components/PaymentReceipts";
import MemberEditForm from "./MemberEditForm";
import MemberIdentityCard from "./MemberIdentityCard";
import DeleteMemberCard from "./DeleteMemberCard";
import MembershipCard from "./MembershipCard";
import ProfileGroup from "./ProfileGroup";
import ProfileList from "./ProfileList";
import SupportPrivacyCard from "./SupportPrivacyCard";
import type { MemberProfile } from "@/components/admin/profileTypes";
import { memberPage as texts, registrationStatusLabels } from "@/lib/texts";
import Money from "@/components/Money";

function day(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toISOString().slice(0, 10);
}

function AdminMemberProfilePageInner({ id }: { id: string }) {
  const router = useRouter();
  const back = adminBackLink(useSearchParams().get("from"));
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
        <AdminBackLink href={back.href}>{back.label}</AdminBackLink>
      </div>
    );
  }

  const { member, supportPrivacy, history, currentYear } = data;
  const activities = member.registrations.length > 0;
  const teams = member.teamMemberships.length > 0;

  return (
    <div className="admin-page space-y-5">
      <AdminBackLink href={back.href}>{back.label}</AdminBackLink>

      <MemberIdentityCard
        memberId={member.id}
        userId={member.user?.id ?? null}
        fullName={member.fullName}
        photo={member.photo}
        phone={member.user?.phone ?? null}
        village={member.village}
        age={member.age}
        memberNumber={member.memberNumber}
        photoLocked={member.photoLocked}
        editing={editing}
        onToggleEdit={() => setEditing((v) => !v)}
        onChanged={load}
      />

      <SamePersonWarning memberId={member.id} />

      {editing && (
        <MemberEditForm
          member={member}
          onSaved={() => {
            setEditing(false);
            load();
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      <ProfileGroup title={texts.groupMembership}>
        <MembershipCard member={member} currentYear={currentYear} onChanged={load} />

        <PaymentReceipts source={`/api/admin/members/${member.id}/receipts`} />

        {member.donations.length > 0 && (
          <ProfileList
            icon="heart"
            title={texts.donations(member.donations.length)}
            rows={member.donations.map((d) => ({
              key: d.id,
              main: (
                <span className="font-bold">
                  {d.amount === null ? "—" : <Money value={d.amount} />}
                </span>
              ),
              aside: (
                <>
                  {d.paymentMethod || d.source} · <span dir="ltr">{day(d.createdAt)}</span>
                </>
              ),
            }))}
          />
        )}
      </ProfileGroup>

      {(activities || teams) && (
        <ProfileGroup title={texts.groupParticipation}>
          {activities && (
            <ProfileList
              icon="trophy"
              title={texts.activities(member.registrations.length)}
              rows={member.registrations.map((r) => ({
                key: r.id,
                main: r.activity.title,
                aside: (
                  <>
                    {registrationStatusLabels[r.status] ?? r.status} ·{" "}
                    <span dir="ltr">{day(r.createdAt)}</span>
                  </>
                ),
              }))}
            />
          )}

          {teams && (
            <ProfileList
              icon="users"
              title={texts.teams(member.teamMemberships.length)}
              rows={member.teamMemberships.map((t) => ({
                key: t.team.id,
                main: t.team.name,
                aside: t.team.activity.title,
              }))}
            />
          )}
        </ProfileGroup>
      )}

      <ProfileGroup title={texts.groupRecord}>
        {supportPrivacy && (
          <SupportPrivacyCard
            memberId={member.id}
            confidential={supportPrivacy.confidential}
            namedEntries={supportPrivacy.namedEntries}
            onChanged={load}
          />
        )}

        <ProfileList
          icon="list"
          title={texts.history(history.length)}
          empty={texts.noHistory}
          rows={history.map((h) => ({
            key: h.id,
            main: <IconLabel name="pencil">{auditActionLabel(h.action)}</IconLabel>,
            aside: (
              <>
                {h.adminUsername} · <span dir="ltr">{day(h.createdAt)}</span>
              </>
            ),
          }))}
        />

        <DeleteMemberCard userId={member.user?.id ?? null} fullName={member.fullName} />
      </ProfileGroup>
    </div>
  );
}

export default function AdminMemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <AdminMemberProfilePageInner id={id} />
    </Suspense>
  );
}
