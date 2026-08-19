"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import { IMPORT_MAX, type ImportProblem, type ImportQuestion } from "@/lib/quizImport";
import { countedNoun, QUESTIONS } from "@/lib/arabicPlural";

const SAMPLE = `[
  {
    "text": "ما عاصمة موريتانيا؟",
    "category": "جغرافيا",
    "points": 10,
    "correctCount": 1,
    "answers": [
      { "text": "نواكشوط", "isCorrect": true },
      { "text": "نواذيبو", "isCorrect": false }
    ]
  }
]`;

interface Review {
  accepted: number;
  problems: ImportProblem[];
  preview: ImportQuestion[];
}

interface Result {
  imported: number;
  skipped: number;
  problems: ImportProblem[];
}

export default function ImportDialog({
  bankId,
  onImported,
  onClose,
}: {
  bankId: string | null;
  onImported: () => void;
  onClose: () => void;
}) {
  const [source, setSource] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function parsed(): unknown {
    return JSON.parse(source);
  }

  async function check() {
    setError("");
    setResult(null);
    let questions: unknown;
    try {
      questions = parsed();
    } catch {
      setReview(null);
      setError("الملف ليس بصيغة JSON صالحة");
      return;
    }
    setBusy(true);
    try {
      setReview(await api.post<Review>("/api/admin/quiz/questions/import", { questions, bankId }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    setBusy(true);
    setError("");
    try {
      const done = await api.post<Result>("/api/admin/quiz/questions/import", {
        questions: parsed(),
        bankId,
        commit: true,
      });
      setResult(done);
      setReview(null);
      onImported();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl md:rounded-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--mint-50)", direction: "rtl" }}
      >
        <DialogHeader title={<IconLabel name="quiz">استيراد أسئلة</IconLabel>} onClose={onClose} />

        <div className="p-5 space-y-3">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            ألصق قائمة الأسئلة بصيغة JSON. الحد الأقصى {countedNoun(IMPORT_MAX, QUESTIONS)} في المرة
            الواحدة.
          </p>

          <label htmlFor="import-source" className="sr-only">
            الأسئلة بصيغة JSON
          </label>
          <textarea
            id="import-source"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setReview(null);
              setResult(null);
            }}
            placeholder={SAMPLE}
            rows={10}
            dir="ltr"
            className="input text-xs"
            style={{ fontFamily: "monospace" }}
          />

          {review && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: "white" }}>
              <p className="text-sm font-bold" style={{ color: "var(--mint-700)" }}>
                جاهز للاستيراد {review.accepted}
              </p>
              {review.preview.map((q, i) => (
                <p key={i} className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {q.text}
                </p>
              ))}
            </div>
          )}

          {(review?.problems.length ?? 0) > 0 && (
            <div className="rounded-xl p-3 space-y-1" style={{ background: "#fee2e2" }}>
              {review!.problems.map((p, i) => (
                <p key={i} className="text-xs font-semibold" style={{ color: "#991b1b" }}>
                  {p.index >= 0 ? `السؤال ${p.index + 1}` : "الملف"} {p.message}
                </p>
              ))}
            </div>
          )}

          {result && (
            <div className="rounded-xl p-3" style={{ background: "white" }}>
              <p className="text-sm font-bold" style={{ color: "var(--mint-700)" }}>
                تمت إضافة {result.imported}
              </p>
              {result.skipped > 0 && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  تم تخطي {result.skipped} موجودة مسبقاً
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
              {error}
            </p>
          )}

          {review && review.accepted > 0 ? (
            <button
              onClick={commit}
              disabled={busy}
              className="btn btn-primary w-full text-sm font-bold"
            >
              {busy ? "..." : `تأكيد إضافة ${review.accepted}`}
            </button>
          ) : (
            <button
              onClick={check}
              disabled={busy || !source.trim()}
              className="btn btn-primary w-full text-sm font-bold disabled:opacity-40"
            >
              {busy ? "..." : "فحص الملف"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
