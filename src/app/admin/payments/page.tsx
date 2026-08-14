"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext, validatePhone, toThumbUrl } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/donations";
import PhotoUpload from "@/components/PhotoUpload";
import { api, errorMessage } from "@/lib/api";

interface Proof {
  id: string;
  kind: "MEMBERSHIP" | "ACTIVITY" | "DONATION";
  proof: string | null;
  memberName: string;
  activityTitle: string | null;
  amount: number | null;
  status: string;
  source?: "PUBLIC" | "SELF";
  paymentMethod?: string | null;
  memberId?: string | null;
  donorName?: string | null;
  donorPhone?: string | null;
  donorPhoto?: string | null;
  uploadedAt: string;
  submittedAt: string;
}

interface DonationResponse {
  donation: {
    id: string;
    donorName: string | null;
    donorPhone: string | null;
    donorPhoto: string | null;
    amount: number | null;
    status: string;
    source: "PUBLIC" | "SELF";
    paymentMethod: string | null;
    proof: string | null;
    memberId: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

interface MemberOption {
  id: string;
  fullName: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "قيد الانتظار",
  ACTIVE: "مقبول",
  REJECTED: "مرفوض",
};
const STATUS_CLASS: Record<string, string> = {
  PENDING: "badge-pending",
  ACTIVE: "badge-active",
  REJECTED: "badge-rejected",
};

const emptyManualDonation = {
  donorName: "",
  donorPhone: "",
  amount: "",
  donorPhoto: "",
  paymentMethod: "",
  proof: "",
};
const PAGE_SIZE = 30;

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"ALL" | "MEMBERSHIP" | "ACTIVITY" | "DONATION">(
    "ALL",
  );
  const [page, setPage] = useState(1);
  const [lastFilterKey, setLastFilterKey] = useState("ALL|");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDonorName, setEditDonorName] = useState("");
  const [editDonorPhone, setEditDonorPhone] = useState("");
  const [editDonorPhoto, setEditDonorPhoto] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editProof, setEditProof] = useState<string | null>(null);
  const [editError, setEditError] = useState("");

  const [showManualDonation, setShowManualDonation] = useState(false);
  const [manualDonation, setManualDonation] = useState(emptyManualDonation);
  const [manualError, setManualError] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/payment-proofs").then((r) => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        return r.json();
      }),
      fetch("/api/admin/members")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([proofsData, membersData]) => {
        if (proofsData?.proofs) setProofs(proofsData.proofs);
        if (membersData?.members)
          setMembers(
            membersData.members.map((m: { id: string; fullName: string }) => ({
              id: m.id,
              fullName: m.fullName,
            })),
          );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deleteDonation(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا التبرع نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    setBusyId(id);
    try {
      await api.del(`/api/admin/donations/${id}`);
      setProofs((prev) => prev.filter((p) => !(p.id === id && p.kind === "DONATION")));
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function reviewDonation(id: string, status: "ACTIVE" | "REJECTED") {
    setBusyId(id);
    try {
      await api.patch(`/api/admin/donations/${id}`, { status });
      setProofs((prev) =>
        prev.map((p) => (p.id === id && p.kind === "DONATION" ? { ...p, status } : p)),
      );
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function linkDonation(id: string, memberId: string | null) {
    setBusyId(id);
    try {
      const data = await api.patch<DonationResponse>(`/api/admin/donations/${id}`, { memberId });
      const linkedName = memberId ? members.find((m) => m.id === memberId)?.fullName : undefined;
      setProofs((prev) =>
        prev.map((p) =>
          p.id === id && p.kind === "DONATION"
            ? { ...p, memberId, memberName: linkedName || data.donation.donorName || "فاعل خير" }
            : p,
        ),
      );
      setLinkingId(null);
      setLinkSearch("");
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(p: Proof) {
    setEditingId(p.id);
    setEditDonorName(p.donorName || "");
    setEditDonorPhone(p.donorPhone || "");
    setEditDonorPhoto(p.donorPhoto || null);
    setEditAmount(p.amount != null ? String(p.amount) : "");
    setEditPaymentMethod(p.paymentMethod || "");
    setEditProof(p.proof || null);
    setEditError("");
  }

  async function saveEdit(p: Proof) {
    setEditError("");
    if (!p.memberId && !editDonorName.trim()) {
      setEditError("الاسم مطلوب");
      return;
    }
    const n = editAmount.trim() ? Number(editAmount) : null;
    if (n !== null && (!Number.isInteger(n) || n <= 0)) {
      setEditError("المبلغ يجب أن يكون رقماً صحيحاً موجباً");
      return;
    }
    setBusyId(p.id);
    try {
      const body: Record<string, unknown> = {
        donorPhone: editDonorPhone.trim() || null,
        paymentMethod: editPaymentMethod || null,
        proof: editProof,
      };
      if (!p.memberId) {
        body.donorName = editDonorName.trim();
        body.donorPhoto = editDonorPhoto;
      }
      if (n !== null) body.amount = n;

      const data = await api.patch<DonationResponse>(`/api/admin/donations/${p.id}`, body);
      setProofs((prev) =>
        prev.map((item) =>
          item.id === p.id && item.kind === "DONATION"
            ? {
                ...item,
                donorName: data.donation.donorName,
                donorPhone: data.donation.donorPhone,
                donorPhoto: data.donation.donorPhoto,
                amount: data.donation.amount,
                paymentMethod: data.donation.paymentMethod,
                proof: data.donation.proof,
                memberName: item.memberId ? item.memberName : data.donation.donorName || "فاعل خير",
              }
            : item,
        ),
      );
      setEditingId(null);
    } catch (e) {
      setEditError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function createManualDonation(e: React.FormEvent) {
    e.preventDefault();
    setManualError("");
    if (!manualDonation.donorName.trim()) {
      setManualError("الاسم مطلوب");
      return;
    }
    if (manualDonation.donorPhone.trim()) {
      const phoneError = validatePhone(manualDonation.donorPhone);
      if (phoneError) {
        setManualError(phoneError);
        return;
      }
    }
    const n = Number(manualDonation.amount);
    if (!Number.isInteger(n) || n <= 0) {
      setManualError("المبلغ يجب أن يكون رقماً صحيحاً موجباً");
      return;
    }

    setManualLoading(true);
    try {
      const data = await api.post<DonationResponse>("/api/admin/donations", {
        donorName: manualDonation.donorName.trim(),
        donorPhone: manualDonation.donorPhone.trim() || null,
        donorPhoto: manualDonation.donorPhoto || null,
        amount: n,
        paymentMethod: manualDonation.paymentMethod || null,
        proof: manualDonation.proof || null,
      });
      const d = data.donation;
      setProofs((prev) => [
        {
          id: d.id,
          kind: "DONATION" as const,
          proof: d.proof,
          memberName: d.donorName || "فاعل خير",
          activityTitle: null,
          amount: d.amount,
          status: d.status,
          source: d.source,
          paymentMethod: d.paymentMethod,
          memberId: d.memberId,
          donorName: d.donorName,
          donorPhone: d.donorPhone,
          donorPhoto: d.donorPhoto,
          uploadedAt: d.updatedAt,
          submittedAt: d.createdAt,
        },
        ...prev,
      ]);
      setManualDonation(emptyManualDonation);
      setShowManualDonation(false);
    } catch (e) {
      setManualError(errorMessage(e));
    } finally {
      setManualLoading(false);
    }
  }

  const q = search.trim();
  const byKind = kindFilter === "ALL" ? proofs : proofs.filter((p) => p.kind === kindFilter);
  const filtered = q
    ? byKind.filter((p) => p.memberName.includes(q) || (p.activityTitle || "").includes(q))
    : byKind;

  // Reset to page 1 whenever the filter/search changes shape — adjusted
  // during render (not an effect) so it takes effect in the same pass
  // instead of causing an extra render.
  const filterKey = `${kindFilter}|${q}`;
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const KIND_TABS: { key: "ALL" | "MEMBERSHIP" | "ACTIVITY" | "DONATION"; label: string }[] = [
    { key: "ALL", label: "الكل" },
    { key: "MEMBERSHIP", label: "💳 انتساب" },
    { key: "ACTIVITY", label: "🏆 الأنشطة" },
    { key: "DONATION", label: "💚 دعم" },
  ];

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
    <div className="admin-page space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          🧾 كل إثباتات الدفع ({proofs.length})
        </p>
        <button
          onClick={() => {
            setShowManualDonation(true);
            setManualError("");
          }}
          className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          ➕ تسجيل تبرع يدوياً
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {KIND_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setKindFilter(t.key)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
            style={{
              background: kindFilter === t.key ? "var(--mint-600)" : "var(--mint-100)",
              color: kindFilter === t.key ? "white" : "var(--mint-700)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="بحث بالاسم أو النشاط..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input text-sm"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
          لا توجد نتائج
        </p>
      ) : (
        <div className="space-y-2">
          {paginated.map((p) => (
            <div key={`${p.kind}-${p.id}`} className="card p-3">
              <div className="flex items-center gap-3">
                {p.proof ? (
                  <a
                    href={`/api/files/${p.proof}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={toThumbUrl(`/api/files/${p.proof}`)}
                      alt={p.memberName}
                      width={56}
                      height={56}
                      loading="lazy"
                      decoding="async"
                      className="w-14 h-14 rounded-lg object-cover"
                      style={{ border: "1px solid var(--mint-100)" }}
                    />
                  </a>
                ) : (
                  <div
                    className="w-14 h-14 rounded-lg flex items-center justify-center text-xl shrink-0"
                    style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
                  >
                    📇
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                      {p.memberName}
                    </p>
                    <span className={`badge ${STATUS_CLASS[p.status] || "badge-pending"}`}>
                      {p.kind === "DONATION" && p.amount
                        ? `${STATUS_LABEL[p.status] || p.status} — ${p.amount} أوقية`
                        : STATUS_LABEL[p.status] || p.status}
                    </span>
                    {p.kind === "DONATION" && p.memberId && (
                      <span className="badge badge-active">🔗 مرتبط بعضو</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {p.kind === "MEMBERSHIP"
                      ? "💳 عضوية الرابطة"
                      : p.kind === "ACTIVITY"
                        ? `🏆 ${p.activityTitle}`
                        : "💚 دعم عام للرابطة"}
                  </p>
                  {p.kind === "DONATION" && p.donorPhone && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }} dir="ltr">
                      📞 {p.donorPhone}
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    رُفعت بتاريخ{" "}
                    {new Date(p.uploadedAt).toLocaleDateString("ar", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {" — "}
                    {new Date(p.uploadedAt).toLocaleTimeString("ar", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
                      <button
                        onClick={() => startEdit(p)}
                        disabled={busyId === p.id}
                        className="text-xs px-3 py-1.5 rounded-lg font-bold"
                        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                      >
                        ✏️ تعديل
                      </button>
                      <button
                        onClick={() => deleteDonation(p.id)}
                        disabled={busyId === p.id}
                        className="text-xs px-3 py-1.5 rounded-lg font-bold"
                        style={{ background: "#fee2e2", color: "#991b1b" }}
                      >
                        {busyId === p.id ? "..." : "🗑️ حذف نهائياً"}
                      </button>
                      {p.source === "PUBLIC" &&
                        (p.memberId ? (
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
                            onClick={() => {
                              setLinkingId(linkingId === p.id ? null : p.id);
                              setLinkSearch("");
                            }}
                            disabled={busyId === p.id}
                            className="text-xs px-3 py-1.5 rounded-lg font-bold"
                            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                          >
                            🔗 ربط بعضو مسجل
                          </button>
                        ))}
                    </div>
                  )}

                  {editingId === p.id && (
                    <div
                      className="mt-2 p-2.5 rounded-lg space-y-2"
                      style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
                    >
                      <PhotoUpload
                        photo={editProof}
                        variant="cover"
                        label="إثبات الدفع"
                        placeholderIcon="🧾"
                        onUpload={(filename) => setEditProof(filename)}
                      />
                      {!p.memberId && (
                        <>
                          <PhotoUpload
                            photo={editDonorPhoto}
                            imageUrlPrefix="/api/files/donation"
                            variant="avatar"
                            label="صورة المتبرع"
                            placeholderIcon="👤"
                            onUpload={(filename) => setEditDonorPhoto(filename)}
                          />
                          <input
                            type="text"
                            placeholder="اسم المتبرع"
                            value={editDonorName}
                            onChange={(e) => setEditDonorName(e.target.value)}
                            maxLength={50}
                            className="input text-xs"
                            style={{ background: "white" }}
                          />
                        </>
                      )}
                      <input
                        type="tel"
                        dir="ltr"
                        placeholder="رقم الهاتف (اختياري)"
                        value={editDonorPhone}
                        onChange={(e) =>
                          setEditDonorPhone(e.target.value.replace(/\D/g, "").slice(0, 8))
                        }
                        maxLength={8}
                        className="input text-xs"
                        style={{ background: "white" }}
                      />
                      <input
                        type="number"
                        dir="ltr"
                        placeholder="المبلغ"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="input text-xs"
                        style={{ background: "white" }}
                      />
                      <select
                        value={editPaymentMethod}
                        onChange={(e) => setEditPaymentMethod(e.target.value)}
                        className="input text-xs"
                        style={{ background: "white" }}
                      >
                        <option value="">طريقة الدفع — غير محددة</option>
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      {editError && (
                        <div
                          className="p-2 rounded-lg text-xs font-semibold"
                          style={{ background: "#fee2e2", color: "#991b1b" }}
                        >
                          ⚠️ {editError}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(p)}
                          disabled={busyId === p.id}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold"
                          style={{ background: "var(--mint-600)", color: "white" }}
                        >
                          {busyId === p.id ? "..." : "💾 حفظ"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold"
                          style={{ background: "white", color: "var(--text-muted)" }}
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {linkingId === p.id && (
                    <div
                      className="mt-2 p-2 rounded-lg"
                      style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
                    >
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
                          <p
                            className="text-xs text-center py-2"
                            style={{ color: "var(--text-muted)" }}
                          >
                            لا يوجد عضو مطابق
                          </p>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-40"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            ← السابق
          </button>
          <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            صفحة {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-40"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            التالي →
          </button>
        </div>
      )}

      {/* Manual donation add */}
      {showManualDonation && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowManualDonation(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
            style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between sticky top-0"
              style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
            >
              <h2 className="font-black text-white text-base">➕ تسجيل تبرع يدوياً</h2>
              <button
                onClick={() => setShowManualDonation(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={createManualDonation} className="p-5 space-y-3">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                لتبرع تلقيته خارج التطبيق نقداً أو تحويلاً — يُحتسب مباشرة في لوحة شرف المتبرعين.
              </p>
              <PhotoUpload
                photo={manualDonation.donorPhoto || null}
                imageUrlPrefix="/api/files/donation"
                variant="avatar"
                label="صورة المتبرع (اختياري)"
                placeholderIcon="👤"
                onUpload={(filename) => setManualDonation((p) => ({ ...p, donorPhoto: filename }))}
              />
              <PhotoUpload
                photo={manualDonation.proof || null}
                variant="cover"
                label="إثبات الدفع (اختياري — يمكن إضافته لاحقاً)"
                placeholderIcon="🧾"
                onUpload={(filename) => setManualDonation((p) => ({ ...p, proof: filename }))}
              />
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                >
                  اسم المتبرع <span style={{ color: "var(--copper-500)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={manualDonation.donorName}
                  onChange={(e) => setManualDonation((p) => ({ ...p, donorName: e.target.value }))}
                  maxLength={50}
                  required
                  className="input"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                >
                  رقم الهاتف (اختياري)
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={manualDonation.donorPhone}
                  onChange={(e) =>
                    setManualDonation((p) => ({
                      ...p,
                      donorPhone: e.target.value.replace(/\D/g, "").slice(0, 8),
                    }))
                  }
                  placeholder="2XXXXXXX"
                  maxLength={8}
                  className="input"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                >
                  المبلغ (MRU) <span style={{ color: "var(--copper-500)" }}>*</span>
                </label>
                <input
                  type="number"
                  dir="ltr"
                  min={1}
                  value={manualDonation.amount}
                  onChange={(e) => setManualDonation((p) => ({ ...p, amount: e.target.value }))}
                  required
                  className="input"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-bold mb-1.5"
                  style={{ color: "var(--text-main)" }}
                >
                  طريقة الدفع
                </label>
                <select
                  value={manualDonation.paymentMethod}
                  onChange={(e) =>
                    setManualDonation((p) => ({ ...p, paymentMethod: e.target.value }))
                  }
                  className="input"
                >
                  <option value="">غير محددة</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {manualError && (
                <div
                  className="p-3 rounded-xl text-sm font-semibold"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  ⚠️ {manualError}
                </div>
              )}

              <button type="submit" disabled={manualLoading} className="btn btn-primary text-sm">
                {manualLoading ? "..." : "تسجيل التبرع"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
