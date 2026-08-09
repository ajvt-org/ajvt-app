"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { validatePhone } from "@/lib/utils";

const PAYMENT_METHODS = ["بنكيلي", "السداد", "مصرفي"];

const PAYMENT_CODES: Record<string, string> = {
  "بنكيلي": "027217",
  "السداد": "08493",
  "مصرفي": "037940",
};

const DEFAULT_AGES = [
  "البدريين",
  "الفائزين",
  "النجميين",
  "المجاهدين",
  "المنصورين",
  "الخاشعين",
  "التائبين",
];

function isArabicName(value: string): boolean {
  return /^[؀-ۿ\s]+$/.test(value.trim());
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingProof, setExistingProof] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // العصر dropdown
  const [ages, setAges] = useState<string[]>(DEFAULT_AGES);
  const [showAddAge, setShowAddAge] = useState(false);
  const [newAge, setNewAge] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    age: "",
    paymentMethod: "",
  });

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/user/me");
      if (meRes.status === 401) { router.push("/login"); return; }
      const me = await meRes.json();

      if (editId) {
        const memberRes = await fetch(`/api/members/${editId}`);
        if (!memberRes.ok) { router.push("/home"); return; }
        const member = await memberRes.json();
        if (member.status === "ACTIVE") { router.push("/home"); return; }
        setForm({
          fullName: member.fullName || "",
          phone: member.phone || "",
          age: member.age || "",
          paymentMethod: member.paymentMethod || "",
        });
        if (member.paymentProof) setExistingProof(member.paymentProof);
      } else if (me?.phone) {
        setForm((p) => ({ ...p, phone: me.phone }));
      }

      setCheckingAuth(false);
    }
    load();

    fetch("/api/ages")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.ages?.length) setAges(data.ages); })
      .catch(() => {});
  }, [router, editId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.fullName.trim()) { setError("يرجى إدخال الاسم الكامل"); return; }
    if (!isArabicName(form.fullName)) {
      setError("الاسم الكامل يجب أن يكون بالحروف العربية فقط");
      return;
    }
    const phoneError = validatePhone(form.phone);
    if (phoneError) { setError(phoneError); return; }
    if (!form.age) { setError("يرجى اختيار العصر"); return; }
    if (!form.paymentMethod) { setError("يرجى اختيار طريقة الدفع"); return; }
    if (!selectedFile && !existingProof) { setError("يرجى إرفاق صورة الكابتير"); return; }

    setLoading(true);
    try {
      let paymentProof = existingProof;
      if (selectedFile) {
        const fd = new FormData();
        fd.append("file", selectedFile);
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (!upRes.ok) throw new Error("فشل رفع صورة الكابتير");
        const uploaded = await upRes.json();
        paymentProof = uploaded.filename;
      }

      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(editId ? { id: editId } : {}), ...form, paymentProof }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال الطلب");
      router.push("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-3xl animate-pulse">⏳</div>
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
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>رابطة شباب قرية التاكلالت</p>
          <h1 className="text-base font-black text-white">
            {editId ? "تعديل الطلب" : "استمارة الانضمام"}
          </h1>
        </div>
      </div>

      <div className="px-5 py-6 pb-10">

        {/* Payment info banner */}
        <div
          className="rounded-2xl p-4 mb-6 fade-up"
          style={{
            background: "linear-gradient(135deg, var(--mint-700), var(--mint-800))",
            border: "1px solid var(--copper-400)",
          }}
        >
          <p className="text-sm font-bold mb-3 text-white">💳 معلومات الدفع</p>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((method) => (
              <div
                key={method}
                className="flex items-center justify-between rounded-xl px-3 py-2"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <span className="text-sm font-semibold text-white">{method}</span>
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono font-bold text-sm"
                    style={{ color: "var(--mint-200)" }}
                    dir="ltr"
                  >
                    {PAYMENT_CODES[method]}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCode(PAYMENT_CODES[method])}
                    className="text-xs px-2 py-1 rounded-lg font-bold transition-all"
                    style={{
                      background: copied === PAYMENT_CODES[method]
                        ? "rgba(52,211,153,0.3)"
                        : "rgba(255,255,255,0.15)",
                      color: copied === PAYMENT_CODES[method] ? "#6ee7b7" : "white",
                      border: "1px solid rgba(255,255,255,0.2)",
                      minWidth: "52px",
                    }}
                  >
                    {copied === PAYMENT_CODES[method] ? "✓ تم" : "نسخ"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.6)" }}>
            أدِّ المبلغ ثم التقط صورة من تأكيد العملية وارفعها أدناه
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 fade-up delay-1">

          {/* الاسم الكامل */}
          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              الاسم الكامل (بالحروف العربية) <span style={{ color: "var(--copper-500)" }}>*</span>
            </label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              required
              placeholder="أدخل اسمك الكامل بالعربية"
              className="input"
            />
            {form.fullName && !isArabicName(form.fullName) && (
              <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
                يرجى الكتابة بالحروف العربية فقط
              </p>
            )}
          </div>

          {/* رقم الهاتف */}
          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              رقم الهاتف <span style={{ color: "var(--copper-500)" }}>*</span>
            </label>
            <PhoneInput
              value={form.phone}
              onChange={(val) => setForm((p) => ({ ...p, phone: val }))}
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              6 أرقام — يبدأ بـ 2 أو 3 أو 4
            </p>
          </div>

          {/* العصر — dropdown */}
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

            {/* Custom age input */}
            {showAddAge && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newAge}
                  onChange={(e) => setNewAge(e.target.value)}
                  placeholder="اكتب اسم العصر..."
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

          {/* طريقة الدفع */}
          <div>
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

          {/* كابتير */}
          <div>
            <p className="text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              كابتير — صورة تأكيد الدفع <span style={{ color: "var(--copper-500)" }}>*</span>
            </p>
            <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
              {previewUrl || existingProof ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl || `/api/files/${existingProof}`}
                    alt="الكابتير"
                    className="max-h-48 mx-auto rounded-xl object-contain"
                  />
                  <p className="mt-2 text-xs text-center" style={{ color: "var(--mint-600)" }}>
                    {previewUrl ? "انقر لتغيير الصورة" : "الصورة الحالية — انقر لتغييرها"}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-4xl mb-2">📸</div>
                  <p className="font-bold text-sm" style={{ color: "var(--mint-700)" }}>
                    انقر لاختيار صورة من هاتفك
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    PNG / JPG — حجم أقصى 5 ميغابايت
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {error && (
            <div className="p-4 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary mt-2">
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
        </form>
      </div>
    </div>
  );
}
