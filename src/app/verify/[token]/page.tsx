import { prisma } from "@/lib/prisma";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { formatDate } from "@/lib/utils";
import { villageField } from "@/lib/texts";
import { nameOf } from "@/lib/person";

export const dynamic = "force-dynamic";

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const person = await prisma.user.findUnique({
    where: { verifyToken: token },
    select: {
      fullName: true,
      age: true,
      village: true,
      memberNumber: true,
      photo: true,
      members: { select: { status: true, createdAt: true }, take: 1 },
    },
  });

  const member = person?.members[0];
  const valid = !!person && member?.status === "ACTIVE";

  return (
    <div className="app-shell">
      <PageHeader title="التحقق من العضوية" />

      {valid ? (
        <>
          <div className="verify-hero">
            <div className="verify-avatar">
              <PlayerAvatar photo={person.photo} fullName={nameOf(person)} size={92} bg="copper" />
              <span className="verify-seal" role="img" aria-label="عضوية سارية">
                <Icon name="check" size={16} color="#065f46" />
              </span>
            </div>
            <h2 className="font-black text-xl text-white">عضوية سارية المفعول</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              {nameOf(person)}
            </p>
          </div>

          <dl className="flex-1 px-5 py-5 space-y-0">
            <Row label="رقم العضوية" value={person.memberNumber || "—"} dir="ltr" />
            <Row label={villageField.label} value={person.village} />
            {person.age && <Row label="العصر" value={person.age} />}
            <Row label="عضو منذ" value={formatDate(member.createdAt)} />
          </dl>

          <div className="px-5 pb-8">
            <HomeLink />
          </div>
        </>
      ) : (
        <div className="flex-1 px-5 py-16 text-center space-y-3">
          <span className="verify-refused" role="img" aria-label="بطاقة غير صالحة">
            <Icon name="ban" size={34} color="#991b1b" />
          </span>
          <h2 className="font-black text-lg" style={{ color: "var(--text-main)" }}>
            بطاقة غير صالحة
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            رقم العضوية غير موجود أو العضوية غير سارية المفعول
          </p>
          <div className="pt-3">
            <HomeLink />
          </div>
        </div>
      )}
    </div>
  );
}

// Not a back button: whoever scanned this arrived from a camera, from outside
// the app entirely. This is the way in rather than the way back.
function HomeLink() {
  return (
    <Link href="/" className="btn btn-ghost">
      <IconLabel name="home">الصفحة الرئيسية للرابطة</IconLabel>
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
