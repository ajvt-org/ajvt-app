import Link from "next/link";
import Image from "next/image";
import { getLeaderboardData } from "@/lib/donationsServer";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const { leaderboard, anonymousTotal } = await getLeaderboardData();

  return (
    <div className="app-shell">
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <Image src="/version-final.png" alt="شعار" width={38} height={38} />
        <div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>رابطة شباب قرية التاكلالت</p>
          <h1 className="text-base font-black text-white">🏆 لوحة شرف المتبرعين</h1>
        </div>
      </div>

      <div className="px-5 py-6 pb-10 space-y-5">
        {leaderboard.length === 0 ? (
          <div className="card p-8 text-center fade-up">
            <div className="text-4xl mb-3">🤍</div>
            <p className="font-semibold" style={{ color: "var(--text-main)" }}>لا يوجد متبرعون بعد</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>كن أول داعم للرابطة!</p>
          </div>
        ) : (
          <div className="card overflow-x-auto fade-up">
            <table className="w-full text-sm" style={{ minWidth: "320px" }}>
              <thead>
                <tr style={{ background: "var(--mint-100)" }}>
                  {["#", "الداعم", "المجموع"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--mint-700)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.rank} style={{ borderTop: "1px solid var(--mint-100)" }}>
                    <td className="px-3 py-2.5 text-center font-bold">
                      {entry.rank <= 3 ? MEDALS[entry.rank - 1] : entry.rank}
                    </td>
                    <td className="px-3 py-2.5 font-bold" style={{ color: "var(--text-main)" }}>
                      <span className="flex items-center gap-2 justify-center">
                        {entry.photo ? (
                          <span className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/api/files/member/${entry.photo}`} alt={entry.name} className="w-full h-full object-cover" />
                          </span>
                        ) : (
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                            style={{ background: "var(--mint-600)" }}
                          >
                            {entry.name.charAt(0)}
                          </span>
                        )}
                        {entry.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-black" style={{ color: "var(--mint-700)" }} dir="ltr">
                      {entry.total} أوقية
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {anonymousTotal > 0 && (
          <p className="text-xs text-center fade-up" style={{ color: "var(--text-muted)" }}>
            🤍 بالإضافة إلى ذلك، تبرّع فاعلو خير مجهولون بمجموع {anonymousTotal} أوقية
          </p>
        )}

        <Link href="/donate" className="btn btn-primary fade-up">
          💚 ادعم الرابطة الآن
        </Link>
      </div>
    </div>
  );
}
