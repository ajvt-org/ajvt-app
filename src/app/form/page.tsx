"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { validatePhone, loginPathWithNext } from "@/lib/utils";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import PhotoUpload from "@/components/PhotoUpload";
import ProofUpload from "@/components/ProofUpload";
import { MEMBERSHIP_FEE, ONLINE_PAYMENT_METHODS as PAYMENT_METHODS, validatePaidAmount } from "@/lib/donations";

// Auto-logout after this long with no click/keypress/scroll/touch.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const PAYMENT_CODES: Record<string, string> = {
  "بنكيلي": "027217",
  "السداد": "08493",
  "مصرفي": "037940",
};

// Filling this form legitimately means leaving the app to pay, then coming
// back — long enough to trip the 30-minute idle logout. Autosaving the text
// fields (not the proof photo, too large for localStorage, nor the
// password, too sensitive) means that doesn't silently wipe out what the
// member already typed.
const DRAFT_KEY = "ajvt_form_draft";

const DEFAULT_AGES = [
  "البدريين",
  "الفائزين",
  "النجميين",
  "المجاهدين",
  "المنصورين",
  "الخاشعين",
  "التائبين",
];

// New registrations walk 3 steps (info → account → payment). Someone who
// already has an account (returning to add another member, or resuming
// mid-flow right after step 2 created one) skips straight past step 2 —
// there's nothing left to create.
const STEPS_NEW = [1, 2, 3] as const;
const STEPS_AUTHENTICATED = [1, 3] as const;

function isArabicName(value: string): boolean {
  return /^[؀-ۿ\s]+$/.test(value.trim());
}

// Excludes visually-ambiguous characters (0/O, 1/I/L) — this gets
// hand-typed into a bank transfer's note field on a small phone screen.
const REFERENCE_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function generateReferenceCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += REFERENCE_CODE_ALPHABET[Math.floor(Math.random() * REFERENCE_CODE_ALPHABET.length)];
  }
  return `AJ-${code}`;
}

function PhoneInput({
  value,
  onChange,
  placeholder = "2XXXXXXX",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="tel"
      inputMode="numeric"
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
        onChange(digits);
      }}
      placeholder={placeholder}
      dir="ltr"
      maxLength={8}
      className="input"
      style={{ letterSpacing: "0.15em" }}
    />
  );
}

function ProgressBar({ stepIndex, total }: { stepIndex: number; total: number }) {
  return (
    <div className="mb-5 fade-up">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all"
            style={{ background: i <= stepIndex ? "var(--mint-600)" : "var(--mint-100)" }}
          />
        ))}
      </div>
      <p className="text-xs text-center mt-1.5 font-semibold" style={{ color: "var(--text-muted)" }}>
        الخطوة {stepIndex + 1} من {total}
      </p>
    </div>
  );
}

export default function FormPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell flex items-center justify-center">
          <div className="text-3xl animate-pulse">⏳</div>
        </div>
      }
    >
      <FormPageInner />
    </Suspense>
  );
}

function FormPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [proofFilename, setProofFilename] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Step 2 — account creation. Never persisted (not part of `form`).
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);

  // العصر dropdown
  const [ages, setAges] = useState<string[]>(DEFAULT_AGES);
  const [showAddAge, setShowAddAge] = useState(false);
  const [newAge, setNewAge] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    age: "",
    paymentMethod: "",
    paidAmount: "",
    referenceCode: "",
  });

  const steps = editId ? STEPS_AUTHENTICATED : authenticated ? STEPS_AUTHENTICATED : STEPS_NEW;
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  useEffect(() => {
    async function load() {
      if (editId) {
        const meRes = await fetch("/api/user/me");
        if (meRes.status === 401) { router.push(loginPathWithNext("/login")); return; }
        const memberRes = await fetch(`/api/members/${editId}`);
        if (!memberRes.ok) { router.push("/home"); return; }
        const member = await memberRes.json();
        if (member.status === "ACTIVE") { router.push("/home"); return; }
        setForm({
          fullName: member.fullName || "",
          phone: member.phone || "",
          age: member.age || "",
          paymentMethod: member.paymentMethod || "",
          paidAmount: member.paidAmount != null ? String(member.paidAmount) : "",
          // Older members predate this field — fall back to a fresh code
          // rather than leaving the reconciliation field blank.
          referenceCode: member.referenceCode || generateReferenceCode(),
        });
        if (member.paymentProof) setProofFilename(member.paymentProof);
        if (member.photo) setPhoto(member.photo);
        setAuthenticated(true);
        setCheckingAuth(false);
        return;
      }

      // A fresh registration doesn't require an account yet — steps 1 and 2
      // (personal info, then account creation) are open to anonymous
      // visitors. Only check whether a session already exists so returning
      // members skip straight past step 2.
      let initialPhone = "";
      const meRes = await fetch("/api/user/me");
      if (meRes.ok) {
        const me = await meRes.json();
        setAuthenticated(true);
        initialPhone = me?.phone || "";
      }

      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setForm({ ...parsed, referenceCode: parsed.referenceCode || generateReferenceCode() });
          setDraftRestored(true);
        } catch {
          setForm((p) => ({ ...p, phone: initialPhone, referenceCode: generateReferenceCode() }));
        }
      } else {
        setForm((p) => ({ ...p, phone: initialPhone, referenceCode: generateReferenceCode() }));
      }

      setCheckingAuth(false);
    }
    load();

    fetch("/api/ages")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.ages?.length) setAges(data.ages); })
      .catch(() => {});
  }, [router, editId]);

  useEffect(() => {
    if (checkingAuth || editId) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }, 300);
    return () => clearTimeout(timeout);
  }, [form, checkingAuth, editId]);

  function startOver() {
    setForm({ fullName: "", phone: "", age: "", paymentMethod: "", paidAmount: "", referenceCode: generateReferenceCode() });
    localStorage.removeItem(DRAFT_KEY);
    setDraftRestored(false);
  }

  function handleAgeSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "__add__") {
      setShowAddAge(true);
      setForm((p) => ({ ...p, age: "" }));
    } else {
      setShowAddAge(false);
      setForm((p) => ({ ...p, age: val }));
    }
  }

  function addCustomAge() {
    const trimmed = newAge.trim();
    if (!trimmed) return;
    if (!ages.includes(trimmed)) {
      setAges((prev) => [...prev, trimmed]);
    }
    setForm((p) => ({ ...p, age: trimmed }));
    setNewAge("");
    setShowAddAge(false);
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  async function shareReferenceCode() {
    const text = `رقم دفتري في رابطة شباب قرية التاكلالت: ${form.referenceCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // user cancelled the share sheet, or the browser rejected it — fall
        // through to copy so the action still does something useful
      }
    }
    copyCode(form.referenceCode);
  }

  function validateStep1(): string | null {
    if (!form.fullName.trim()) return "يرجى إدخال الاسم الكامل";
    if (!isArabicName(form.fullName)) return "الاسم الكامل يجب أن يكون بالحروف العربية فقط";
    const phoneError = validatePhone(form.phone);
    if (phoneError) return phoneError;
    if (!form.age) return "يرجى اختيار العصر";
    return null;
  }

  function goBack() {
    setError("");
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function goNextFromStep1() {
    setError("");
    const err = validateStep1();
    if (err) { setError(err); return; }
    setStepIndex((i) => i + 1);
  }

  async function createAccount() {
    setError("");
    if (password.length < 3) { setError("كلمة المرور يجب أن تكون 3 أحرف على الأقل"); return; }
    if (password !== confirmPassword) { setError("كلمتا المرور غير متطابقتين"); return; }

    setAccountLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء الحساب");
      // `steps` recomputes to [1, 3] now that authenticated is true —
      // stepIndex (still 1) lands on step 3 automatically.
      setAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setAccountLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const step1Error = validateStep1();
    if (step1Error) { setError(step1Error); return; }
    if (!form.paymentMethod) { setError("يرجى اختيار طريقة الدفع"); return; }
    const paidAmountError = validatePaidAmount(form.paidAmount);
    if (paidAmountError) { setError(paidAmountError); return; }
    if (proofUploading) { setError("يرجى الانتظار حتى انتهاء رفع الصورة"); return; }
    if (!proofFilename) { setError("يرجى إرفاق صورة الكابتير"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(editId ? { id: editId } : {}), ...form, paidAmount: Number(form.paidAmount), paymentProof: proofFilename, photo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال الطلب");
      if (!editId) localStorage.removeItem(DRAFT_KEY);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  async function handleIdleTimeout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // Anonymous visitors on steps 1-2 have no session to lose — only arm the
  // idle logout once an account actually exists (editing, or past step 2).
  useInactivityLogout(IDLE_TIMEOUT_MS, handleIdleTimeout, authenticated && !checkingAuth);

  if (checkingAuth) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-3xl animate-pulse">⏳</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="app-shell">
        <div
          className="px-5 py-8 text-center"
          style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
        >
          <div className="text-5xl mb-2">✅</div>
          <h1 className="text-lg font-black text-white">
            {editId ? "تم إرسال التعديلات بنجاح" : "تم إرسال طلبك بنجاح"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>
            سيراجع فريق الرابطة طلبك خلال أقل من ساعة
          </p>
        </div>

        <div className="px-5 py-6 space-y-4">
          <div className="card p-4 fade-up">
            <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
              رقم دفترك — احتفظ به للمتابعة
            </p>
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "var(--mint-50)" }}>
              <span className="font-mono font-black text-lg" style={{ color: "var(--mint-700)" }} dir="ltr">
                {form.referenceCode}
              </span>
              <button
                type="button"
                onClick={() => copyCode(form.referenceCode)}
                className="text-xs px-3 py-1.5 rounded-lg font-bold"
                style={{ background: copied === form.referenceCode ? "var(--mint-600)" : "white", color: copied === form.referenceCode ? "white" : "var(--mint-700)", border: "1px solid var(--mint-200)" }}
              >
                {copied === form.referenceCode ? "✓ تم النسخ" : "نسخ"}
              </button>
            </div>
          </div>

          <div className="card p-4 fade-up delay-1">
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>ملخص الطلب</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>الاسم</span><span className="font-bold">{form.fullName}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>العصر</span><span className="font-bold">{form.age}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>طريقة الدفع</span><span className="font-bold">{form.paymentMethod}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>المبلغ</span><span className="font-bold" dir="ltr">{form.paidAmount} أوقية</span></div>
            </div>
          </div>

          <button type="button" onClick={shareReferenceCode} className="btn btn-primary fade-up delay-1">
            📤 مشاركة رقم الدفتر
          </button>
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="btn fade-up delay-2"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            الذهاب إلى حسابي ←
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-3 sticky top-0 z-20"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <Image src="/version-final.png" alt="شعار" width={38} height={38} />
        <div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
            رابطة شباب قرية التاكلالت
          </p>
          <h1 className="text-base font-black text-white">
            {editId ? "تعديل الطلب" : "استمارة الانضمام"}
          </h1>
        </div>
      </div>

      <div className="px-5 py-6 pb-10">

        {!editId && <ProgressBar stepIndex={stepIndex} total={steps.length} />}

        {draftRestored && !editId && currentStep === 1 && (
          <div
            className="rounded-2xl p-3 mb-4 fade-up flex items-center justify-between gap-3"
            style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)" }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--mint-700)" }}>
              💾 تم استرجاع بياناتك المحفوظة من محاولة سابقة
            </p>
            <button
              type="button"
              onClick={startOver}
              className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
              style={{ background: "white", color: "var(--text-muted)", border: "1px solid var(--mint-200)" }}
            >
              البدء من جديد
            </button>
          </div>
        )}

        {currentStep === 1 && !editId && (
          <div
            className="rounded-2xl p-4 mb-4 fade-up text-center"
            style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)" }}
          >
            <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              🏆 الاشتراك في الرابطة هو ما يتيح لك المشاركة في الأنشطة والفعاليات
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              تريد فقط دعم الرابطة دون الانضمام كعضو؟{" "}
              <Link href="/donate" className="font-bold" style={{ color: "var(--mint-600)" }}>
                تبرّع من هنا
              </Link>
            </p>
          </div>
        )}

        {/* Step 1 — personal info */}
        {currentStep === 1 && (
          <div className="space-y-5 fade-up delay-1">
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                الاسم الكامل (بالحروف العربية) <span style={{ color: "var(--copper-500)" }}>*</span>
              </label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                required
                maxLength={30}
                placeholder="أدخل اسمك الكامل بالعربية"
                className="input"
              />
              {form.fullName && !isArabicName(form.fullName) && (
                <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
                  يرجى الكتابة بالحروف العربية فقط
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                رقم الهاتف <span style={{ color: "var(--copper-500)" }}>*</span>
              </label>
              <PhoneInput
                value={form.phone}
                onChange={(val) => setForm((p) => ({ ...p, phone: val }))}
              />
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                8 أرقام — يبدأ بـ 2 أو 3 أو 4
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                العصر <span style={{ color: "var(--copper-500)" }}>*</span>
              </label>
              <select
                value={showAddAge ? "__add__" : form.age}
                onChange={handleAgeSelect}
                className="input"
                style={{ appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%234a9c7e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "left 12px center", paddingLeft: "36px" }}
              >
                <option value="" disabled>اختر العصر...</option>
                {ages.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
                <option value="__add__">➕ إضافة عصر جديد</option>
              </select>

              {showAddAge && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="اكتب اسم العصر..."
                    maxLength={30}
                    className="input flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomAge(); } }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={addCustomAge}
                    disabled={!newAge.trim()}
                    className="btn btn-primary px-4 py-2 text-sm font-bold disabled:opacity-40"
                    style={{ width: "auto" }}
                  >
                    إضافة
                  </button>
                </div>
              )}

              {form.age && !showAddAge && (
                <p className="text-xs mt-1 font-semibold" style={{ color: "var(--mint-600)" }}>
                  ✓ {form.age}
                </p>
              )}
            </div>

            {error && (
              <div className="p-4 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
                ⚠️ {error}
              </div>
            )}

            <button type="button" onClick={goNextFromStep1} className="btn btn-primary mt-2">
              التالي ←
            </button>
          </div>
        )}

        {/* Step 2 — account creation (skipped for members who already have one) */}
        {currentStep === 2 && (
          <div className="space-y-5 fade-up delay-1">
            <div className="card p-4 text-center">
              <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
                🔒 أنشئ حساباً لحفظ طلبك ومتابعته لاحقاً
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }} dir="ltr">
                {form.phone}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                كلمة المرور <span style={{ color: "var(--copper-500)" }}>*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                تأكيد كلمة المرور <span style={{ color: "var(--copper-500)" }}>*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input"
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
                ⚠️ {error}
                {error === "رقم الهاتف مسجّل مسبقاً" && (
                  <>
                    {" — "}
                    <Link href={loginPathWithNext("/login")} className="underline font-bold">
                      تسجيل الدخول
                    </Link>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button type="button" onClick={goBack} className="btn px-4" style={{ width: "auto", background: "var(--mint-100)", color: "var(--mint-700)" }}>
                → السابق
              </button>
              <button type="button" onClick={createAccount} disabled={accountLoading} className="btn btn-primary flex-1">
                {accountLoading ? "جاري إنشاء الحساب..." : "التالي ←"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — payment and proof */}
        {currentStep === 3 && (
          <>
            <div className="card p-4 mb-4 fade-up">
              <PhotoUpload
                photo={photo}
                onUpload={(filename) => setPhoto(filename)}
                label="الصورة الشخصية (اختياري)"
                placeholderIcon="👤"
              />
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                يمكنك إضافتها الآن أو لاحقاً من صفحتك الشخصية
              </p>
            </div>

            <div className="fade-up">
              <label className="block text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
                طريقة الدفع <span style={{ color: "var(--copper-500)" }}>*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, paymentMethod: method }))}
                    className="py-3 rounded-xl text-sm font-bold transition-all border-2"
                    style={{
                      background: form.paymentMethod === method ? "var(--mint-600)" : "white",
                      color: form.paymentMethod === method ? "white" : "var(--mint-700)",
                      borderColor: form.paymentMethod === method ? "var(--mint-600)" : "var(--mint-200)",
                    }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {form.paymentMethod && (
              <div
                className="rounded-2xl p-4 mt-4 mb-6 fade-up"
                style={{
                  background: "linear-gradient(135deg, var(--mint-700), var(--mint-800))",
                  border: "1px solid var(--copper-400)",
                }}
              >
                <p className="text-sm font-bold mb-3 text-white">💳 الدفع عبر {form.paymentMethod}</p>
                <div className="space-y-2">
                  <div
                    className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <span className="text-sm font-semibold text-white">رقم المستلم</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm" style={{ color: "var(--mint-200)" }} dir="ltr">
                        {PAYMENT_CODES[form.paymentMethod]}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyCode(PAYMENT_CODES[form.paymentMethod])}
                        className="text-xs px-2 py-1 rounded-lg font-bold transition-all"
                        style={{
                          background: copied === PAYMENT_CODES[form.paymentMethod] ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.15)",
                          color: copied === PAYMENT_CODES[form.paymentMethod] ? "#6ee7b7" : "white",
                          border: "1px solid rgba(255,255,255,0.2)",
                          minWidth: "52px",
                        }}
                      >
                        {copied === PAYMENT_CODES[form.paymentMethod] ? "✓ تم" : "نسخ"}
                      </button>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <span className="text-sm font-semibold text-white">المبلغ</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm" style={{ color: "var(--mint-200)" }} dir="ltr">
                        {form.paidAmount || MEMBERSHIP_FEE}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyCode(String(form.paidAmount || MEMBERSHIP_FEE))}
                        className="text-xs px-2 py-1 rounded-lg font-bold transition-all"
                        style={{
                          background: copied === String(form.paidAmount || MEMBERSHIP_FEE) ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.15)",
                          color: copied === String(form.paidAmount || MEMBERSHIP_FEE) ? "#6ee7b7" : "white",
                          border: "1px solid rgba(255,255,255,0.2)",
                          minWidth: "52px",
                        }}
                      >
                        {copied === String(form.paidAmount || MEMBERSHIP_FEE) ? "✓ تم" : "نسخ"}
                      </button>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <span className="text-sm font-semibold text-white">رمز الطلب (اكتبه في سبب التحويل)</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm" style={{ color: "var(--mint-200)" }} dir="ltr">
                        {form.referenceCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyCode(form.referenceCode)}
                        className="text-xs px-2 py-1 rounded-lg font-bold transition-all"
                        style={{
                          background: copied === form.referenceCode ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.15)",
                          color: copied === form.referenceCode ? "#6ee7b7" : "white",
                          border: "1px solid rgba(255,255,255,0.2)",
                          minWidth: "52px",
                        }}
                      >
                        {copied === form.referenceCode ? "✓ تم" : "نسخ"}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.6)" }}>
                  الاشتراك 100 أوقية على الأقل — أدِّ المبلغ ثم التقط صورة من تأكيد العملية وارفعها أدناه
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 fade-up delay-1">
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
                  المبلغ المدفوع (أوقية) <span style={{ color: "var(--copper-500)" }}>*</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={MEMBERSHIP_FEE}
                  value={form.paidAmount}
                  onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))}
                  placeholder={String(MEMBERSHIP_FEE)}
                  className="input"
                  dir="ltr"
                />
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  الحد الأدنى {MEMBERSHIP_FEE} أوقية لرسوم الاشتراك — أي مبلغ زائد يُسجَّل تلقائياً كتبرّع باسمك بعد قبول الطلب
                </p>
              </div>

              <ProofUpload existingProof={proofFilename} onUploaded={setProofFilename} onUploadingChange={setProofUploading} />

              {error && (
                <div className="p-4 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
                  ⚠️ {error}
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={goBack} className="btn px-4" style={{ width: "auto", background: "var(--mint-100)", color: "var(--mint-700)" }}>
                  → السابق
                </button>
                <button type="submit" disabled={loading || proofUploading} className="btn btn-primary flex-1">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      جاري إرسال الطلب...
                    </span>
                  ) : editId ? (
                    "حفظ التعديلات ←"
                  ) : (
                    "إرسال طلب الانضمام ←"
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
