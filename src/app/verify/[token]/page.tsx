import { prisma } from "@/lib/prisma";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import PageHeader from "@/components/PageHeader";
import { getUserSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Reached by scanning the QR on a membership card, so it answers to anyone.
// It is looked up by verifyToken and never by memberNumber: the number runs in
// sequence, and a page keyed on it can be counted through from a single card.
//
// It shows what someone checking a card at a door needs and nothing else. The
// activities a member signed up for are not that.
export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const session = await getUserSession();
  const { token } = await params;

  const member = await prisma.member.findUnique({
    where: { verifyToken: token },
    select: {
      fullName: true,
      age: true,
      status: true,
      memberNumber: true,
      createdAt: true,
      photo: true,
    },
  });

  const valid = !!member && member.status === "ACTIVE";

  return (
    <div className="app-shell">
      <PageHeader title={"التحقق من العضوية"} backHref={session ? "/profile" : "/"} />

      <div className="flex-1 px-5 py-8 space-y-5">
        {valid ? (
          <div className="card p-6 fade-up" style={{ borderColor: "var(--mint-400)" }}>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="mb-3" style={{ position: "relative" }}>
                <PlayerAvatar
                  photo={member!.photo}
                  fullName={member!.fullName}
                  size={80}
                  bg="copper"
                />
                <span
                  className="flex items-center justify-center text-sm"
                  style={{
                    position: "absolute",
                    bottom: -2,
                    left: -2,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "#d1fae5",
                    border: "2px solid white",
                  }}
                >
                  ✅
                </span>
              </div>
              <h2 className="font-black text-lg" style={{ color: "var(--text-main)" }}>
                عضوية سارية المفعول
              </h2>
              <span className="badge badge-active mt-2">مقبول</span>
            </div>

            <div className="space-y-3 pt-4" style={{ borderTop: "1px solid var(--mint-100)" }}>
              <Row label="الاسم الكامل" value={member!.fullName} />
              <Row label="رقم العضوية" value={member!.memberNumber || "—"} dir="ltr" />
              <Row label="العصر" value={member!.age} />
              <Row label="عضو منذ" value={formatDate(member!.createdAt)} />
            </div>
          </div>
        ) : (
          <div className="card p-6 text-center fade-up" style={{ borderColor: "#fca5a5" }}>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 mx-auto"
              style={{ background: "#fee2e2" }}
            >
              ❌
            </div>
            <h2 className="font-black text-lg mb-2" style={{ color: "var(--text-main)" }}>
              بطاقة غير صالحة
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              رقم العضوية غير موجود أو العضوية غير سارية المفعول
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, dir }: { label: string; value: string; dir?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: "var(--text-main)" }} dir={dir}>
        {value}
      </span>
    </div>
  );
}
