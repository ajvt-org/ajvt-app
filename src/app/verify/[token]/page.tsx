import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import VerifyEnrollments from "@/components/VerifyEnrollments";
import { formatDate } from "@/lib/utils";
import { nameOf } from "@/lib/person";
import { verifyPage, villageField } from "@/lib/texts";
import { loadVerifiedMember } from "@/lib/verifyEnrollmentsServer";

export const dynamic = "force-dynamic";

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const member = await loadVerifiedMember(token);

  return (
    <div className="app-shell">
      <PageHeader title={verifyPage.title} />

      {member ? (
        <>
          <div className="verify-hero">
            <div className="verify-avatar">
              <PlayerAvatar photo={member.photo} fullName={nameOf(member)} size={92} bg="copper" />
              <span className="verify-seal" role="img" aria-label={verifyPage.validSeal}>
                <Icon name="check" size={16} color="#065f46" />
              </span>
            </div>
            <h2 className="font-black text-xl text-white">{verifyPage.validHeading}</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              {nameOf(member)}
            </p>
          </div>

          <dl className="px-5 py-5 space-y-0">
            <Row label={verifyPage.memberNumber} value={member.memberNumber || "—"} dir="ltr" />
            <Row label={villageField.label} value={member.village} />
            {member.age && <Row label={verifyPage.age} value={member.age} />}
            <Row label={verifyPage.memberSince} value={formatDate(member.memberSince)} />
          </dl>

          <VerifyEnrollments items={member.enrollments} />

          <div className="px-5 pb-8 mt-auto">
            <HomeLink />
          </div>
        </>
      ) : (
        <div className="flex-1 px-5 py-16 text-center space-y-3">
          <span className="verify-refused" role="img" aria-label={verifyPage.invalidHeading}>
            <Icon name="ban" size={34} color="#991b1b" />
          </span>
          <h2 className="font-black text-lg" style={{ color: "var(--text-main)" }}>
            {verifyPage.invalidHeading}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {verifyPage.invalidDescription}
          </p>
          <div className="pt-3">
            <HomeLink />
          </div>
        </div>
      )}
    </div>
  );
}

function HomeLink() {
  return (
    <Link href="/" className="btn btn-ghost">
      <IconLabel name="home">{verifyPage.homeLink}</IconLabel>
    </Link>
  );
}

function Row({ label, value, dir }: { label: string; value: string; dir?: string }) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3"
      style={{ borderBottom: "1px solid var(--mint-100)" }}
    >
      <dt className="text-sm" style={{ color: "var(--text-muted)" }}>
        {label}
      </dt>
      <dd className="text-sm font-bold" style={{ color: "var(--text-main)" }} dir={dir}>
        {value}
      </dd>
    </div>
  );
}
