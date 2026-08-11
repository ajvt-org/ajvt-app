"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";

interface Proof {
  id: string;
  kind: "MEMBERSHIP" | "ACTIVITY" | "DONATION";
  proof: string;
  memberName: string;
  activityTitle: string | null;
  amount: number | null;
  status: string;
  uploadedAt: string;
  submittedAt: string;
}

const STATUS_LABEL: Record<string, string> = { PENDING: "قيد الانتظار", ACTIVE: "مقبول", REJECTED: "مرفوض" };
const STATUS_CLASS: Record<string, string> = { PENDING: "badge-pending", ACTIVE: "badge-active", REJECTED: "badge-rejected" };

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/payment-proofs")
      .then((r) => {
        if (r.status === 401) { router.push(loginPathWithNext("/admin/login")); return null; }
        return r.json();
      })
      .then((data) => { if (data?.proofs) setProofs(data.proofs); })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = search.trim();
  const filtered = q
    ? proofs.filter((p) => p.memberName.includes(q) || (p.activityTitle || "").includes(q))
    : proofs;

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: "var(--mint-500)" }}>
        <div className="text-4xl animate-pulse mb-3">⏳</div>
        <p className="text-sm font-semibold">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        🧾 كل إثباتات الدفع ({proofs.length})
      </p>
      <input
        type="text"
        placeholder="بحث بالاسم أو النشاط..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input text-sm"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>لا توجد نتائج</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <a
              key={`${p.kind}-${p.id}`}
              href={`/api/files/${p.proof}`}
              target="_blank"
              rel="noopener noreferrer"
              className="card p-3 flex items-center gap-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${p.proof}`}
                alt={p.memberName}
                className="w-14 h-14 rounded-lg object-cover shrink-0"
                style={{ border: "1px solid var(--mint-100)" }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>{p.memberName}</p>
                  {p.kind === "DONATION" ? (
                    <span className="badge badge-active">💚 تبرّع{p.amount ? ` — ${p.amount} أوقية` : ""}</span>
                  ) : (
                    <span className={`badge ${STATUS_CLASS[p.status] || "badge-pending"}`}>{STATUS_LABEL[p.status] || p.status}</span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {p.kind === "MEMBERSHIP" ? "💳 عضوية الرابطة" : p.kind === "ACTIVITY" ? `🏆 ${p.activityTitle}` : "دعم عام للرابطة"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  رُفعت بتاريخ {new Date(p.uploadedAt).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
