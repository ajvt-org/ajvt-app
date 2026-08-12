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
  source?: "PUBLIC" | "SELF";
  memberId?: string | null;
  uploadedAt: string;
  submittedAt: string;
}

interface MemberOption {
  id: string;
  fullName: string;
}

const STATUS_LABEL: Record<string, string> = { PENDING: "قيد الانتظار", ACTIVE: "مقبول", REJECTED: "مرفوض" };
const STATUS_CLASS: Record<string, string> = { PENDING: "badge-pending", ACTIVE: "badge-active", REJECTED: "badge-rejected" };

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/payment-proofs").then((r) => {
        if (r.status === 401) { router.push(loginPathWithNext("/admin/login")); return null; }
        return r.json();
      }),
      fetch("/api/admin/members").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([proofsData, membersData]) => {
        if (proofsData?.proofs) setProofs(proofsData.proofs);
        if (membersData?.members) setMembers(membersData.members.map((m: { id: string; fullName: string }) => ({ id: m.id, fullName: m.fullName })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reviewDonation(id: string, status: "ACTIVE" | "REJECTED") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/donations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setProofs((prev) => prev.map((p) => (p.id === id && p.kind === "DONATION" ? { ...p, status } : p)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusyId(null);
    }
  }

  async function linkDonation(id: string, memberId: string | null) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/donations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      const linkedName = memberId ? members.find((m) => m.id === memberId)?.fullName : undefined;
      setProofs((prev) => prev.map((p) => (p.id === id && p.kind === "DONATION"
        ? { ...p, memberId, memberName: linkedName || data.donation.donorName || "فاعل خير" }
        : p)));
      setLinkingId(null);
      setLinkSearch("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusyId(null);
    }
  }

  const q = search.trim();
  const filtered = q
    ? proofs.filter((p) => p.memberName.includes(q) || (p.activityTitle || "").includes(q))
    : proofs;

  const linkQuery = linkSearch.trim();
  const linkResults = linkQuery
    ? members.filter((m) => m.fullName.includes(linkQuery)).slice(0, 8)
    : members.slice(0, 8);

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
            <div key={`${p.kind}-${p.id}`} className="card p-3">
              <div className="flex items-center gap-3">
                <a href={`/api/files/${p.proof}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/${p.proof}`}
                    alt={p.memberName}
                    className="w-14 h-14 rounded-lg object-cover"
                    style={{ border: "1px solid var(--mint-100)" }}
                  />
                </a>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>{p.memberName}</p>
                    <span className={`badge ${STATUS_CLASS[p.status] || "badge-pending"}`}>
                      {p.kind === "DONATION" && p.amount ? `${STATUS_LABEL[p.status] || p.status} — ${p.amount} أوقية` : STATUS_LABEL[p.status] || p.status}
                    </span>
                    {p.kind === "DONATION" && p.memberId && (
                      <span className="badge badge-active">🔗 مرتبط بعضو</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {p.kind === "MEMBERSHIP" ? "💳 عضوية الرابطة" : p.kind === "ACTIVITY" ? `🏆 ${p.activityTitle}` : "💚 دعم عام للرابطة"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    رُفعت بتاريخ {new Date(p.uploadedAt).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" })}
                  </p>

                  {p.kind === "DONATION" && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {p.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => reviewDonation(p.id, "ACTIVE")}
                            disabled={busyId === p.id}
                            className="text-xs px-3 py-1.5 rounded-lg font-bold"
                            style={{ background: "var(--mint-600)", color: "white" }}
                          >
                            {busyId === p.id ? "..." : "✓ قبول"}
                          </button>
                          <button
                            onClick={() => reviewDonation(p.id, "REJECTED")}
                            disabled={busyId === p.id}
                            className="text-xs px-3 py-1.5 rounded-lg font-bold"
                            style={{ background: "#fee2e2", color: "#991b1b" }}
                          >
                            {busyId === p.id ? "..." : "✕ رفض"}
                          </button>
                        </>
                      )}
                      {p.status === "ACTIVE" && (
                        <button
                          onClick={() => reviewDonation(p.id, "REJECTED")}
                          disabled={busyId === p.id}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold"
                          style={{ background: "#fee2e2", color: "#991b1b" }}
                        >
                          {busyId === p.id ? "..." : "🚫 إبطال التبرع"}
                        </button>
                      )}
                      {p.status === "REJECTED" && (
                        <button
                          onClick={() => reviewDonation(p.id, "ACTIVE")}
                          disabled={busyId === p.id}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold"
                          style={{ background: "var(--mint-600)", color: "white" }}
                        >
                          {busyId === p.id ? "..." : "↩️ إعادة تفعيل"}
                        </button>
                      )}
                      {p.source === "PUBLIC" && (
                        p.memberId ? (
                          <button
                            onClick={() => linkDonation(p.id, null)}
                            disabled={busyId === p.id}
                            className="text-xs px-3 py-1.5 rounded-lg font-bold"
                            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                          >
                            {busyId === p.id ? "..." : "إلغاء الربط"}
                          </button>
                        ) : (
                          <button
                            onClick={() => { setLinkingId(linkingId === p.id ? null : p.id); setLinkSearch(""); }}
                            disabled={busyId === p.id}
                            className="text-xs px-3 py-1.5 rounded-lg font-bold"
                            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                          >
                            🔗 ربط بعضو مسجل
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {linkingId === p.id && (
                    <div className="mt-2 p-2 rounded-lg" style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}>
                      <input
                        type="text"
                        autoFocus
                        placeholder="ابحث باسم العضو..."
                        value={linkSearch}
                        onChange={(e) => setLinkSearch(e.target.value)}
                        className="input text-xs"
                        style={{ background: "white" }}
                      />
                      <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto">
                        {linkResults.length === 0 ? (
                          <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>لا يوجد عضو مطابق</p>
                        ) : (
                          linkResults.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => linkDonation(p.id, m.id)}
                              disabled={busyId === p.id}
                              className="w-full text-right text-xs px-2.5 py-1.5 rounded-lg font-semibold"
                              style={{ background: "white", color: "var(--text-main)" }}
                            >
                              {m.fullName}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
