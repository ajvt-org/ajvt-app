import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ memberNumber: string }>;
}) {
  const { memberNumber } = await params;

  const member = await prisma.member.findUnique({
    where: { memberNumber },
    select: {
      fullName: true,
      age: true,
      status: true,
      memberNumber: true,
      createdAt: true,
    },
  });

  const valid = !!member && member.status === "ACTIVE";

  return (
    <div className="app-shell">
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <Image src="/version-final.png" alt="شعار" width={38} height={38} />
        <div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
            رابطة شباب قرية التاكلالت
          </p>
          <h1 className="text-base font-black text-white">التحقق من العضوية</h1>
        </div>
      </div>

      <div className="flex-1 px-5 py-8 space-y-5">
        {valid ? (
          <div className="card p-6 fade-up" style={{ borderColor: "var(--mint-400)" }}>
            <div className="flex flex-col items-center text-center mb-5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3"
                style={{ background: "#d1fae5" }}
              >
                ✅
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
              <Row
                label="عضو منذ"
                value={new Date(member!.createdAt).toLocaleDateString("ar", {
                  year: "numeric", month: "long", day: "numeric", weekday: "long",
                })}
              />
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
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: "var(--text-main)" }} dir={dir}>{value}</span>
    </div>
  );
}
