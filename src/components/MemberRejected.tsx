"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import ArrowLabel from "@/components/ArrowLabel";
import ProofUpload from "@/components/ProofUpload";
import { errorMessage } from "@/lib/api";
import type { MemberData } from "@/lib/useMember";

// A rejected request is almost always a bad payment proof, so the shortest
// path back is a new photo and one button, without walking the whole form
// again. Everything else is still reachable through the link underneath.
export default function MemberRejected({
  member,
  onReload,
}: {
  member: MemberData;
  onReload: () => void;
}) {
  const router = useRouter();
  const [newProof, setNewProof] = useState<string | null>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [error, setError] = useState("");

  async function resubmit() {
    if (!newProof) return;
    setResubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: member.id,
          fullName: member.fullName,
          age: member.age,
          paymentMethod: member.paymentMethod,
          paidAmount: member.paidAmount,
          paymentProof: newProof,
          photo: member.photo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال الطلب");
      onReload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setResubmitting(false);
    }
  }

  return (
    <div className="card p-5">
      {member.rejectionReason && (
        <div
          className="rounded-xl p-3 mb-4"
          style={{ background: "#fff5f5", border: "1px solid #fca5a5" }}
        >
          <p className="text-xs font-bold mb-0.5" style={{ color: "#991b1b" }}>
            سبب الرفض
          </p>
          <p className="text-sm font-semibold" style={{ color: "#991b1b" }}>
            {member.rejectionReason}
          </p>
        </div>
      )}

      <p className="text-sm mb-3 font-bold" style={{ color: "var(--text-main)" }}>
        أرفق صورة جديدة لإثبات الدفع وأعد الإرسال مباشرة
      </p>
      <ProofUpload existingProof={member.paymentProof} onUploaded={setNewProof} />

      {error && (
        <p className="text-xs mt-2 font-semibold" style={{ color: "#dc2626" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}

      <button
        onClick={resubmit}
        disabled={!newProof || resubmitting}
        className="btn btn-primary mt-3 disabled:opacity-40"
      >
        {resubmitting ? "جاري إعادة الإرسال..." : <ArrowLabel>إعادة الإرسال</ArrowLabel>}
      </button>

      <button
        onClick={() => router.push(`/form?id=${member.id}`)}
        className="text-xs font-bold mt-3 w-full text-center"
        style={{ color: "var(--mint-600)" }}
      >
        أو عدّل بيانات أخرى في الطلب
      </button>
    </div>
  );
}
