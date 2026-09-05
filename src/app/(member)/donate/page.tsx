"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PaymentInfoBanner from "@/components/PaymentInfoBanner";
import PaymentMethodChoice from "@/components/PaymentMethodChoice";
import { usePayableMethods } from "@/lib/usePayableMethods";
import PageHeader from "@/components/PageHeader";
import { arabicValidity } from "@/lib/validationMessage";
import { errorMessage } from "@/lib/api";
import { validateDonorChoice } from "@/lib/donorChoice";
import DonorNameChoice from "@/components/DonorNameChoice";
import DonateThanks from "./DonateThanks";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";
import { donate as texts } from "@/lib/texts";
import { withFrom } from "@/lib/backLink";

export default function DonatePage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell">
          <PageLoading />
        </div>
      }
    >
      <DonatePageInner />
    </Suspense>
  );
}

function DonatePageInner() {
  const offer = usePayableMethods();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const [lockedMember, setLockedMember] = useState<{ id: string; fullName: string } | null>(null);
  const [checkingMember, setCheckingMember] = useState(true);
  const [confirmedAnonymous, setConfirmedAnonymous] = useState(false);

  const [wantsName, setWantsName] = useState<boolean | null>(null);
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const lookup = userId
      ? fetch(`/api/members/${userId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) =>
            data && data.status === "ACTIVE" ? [{ id: data.id, fullName: data.fullName }] : [],
          )
      : fetch("/api/user/me")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) =>
            (data?.members ?? [])
              .filter((m: { status: string }) => m.status === "ACTIVE")
              .map((m: { id: string; fullName: string }) => ({ id: m.id, fullName: m.fullName })),
          );

    lookup
      .then((found: { id: string; fullName: string }[]) => {
        if (found.length > 0) {
          setLockedMember(found[0]);
          setWantsName(true);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingMember(false));
  }, [userId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!selectedFile) {
      setError(texts.proofRequired);
      return;
    }
    const n = Number(amount);
    if (!amount.trim() || !Number.isInteger(n) || n <= 0) {
      setError(texts.amountRequired);
      return;
    }
    if (!paymentMethod) {
      setError(texts.methodRequired);
      return;
    }
    const choiceError = validateDonorChoice(
      wantsName === null ? null : !wantsName,
      lockedMember ? lockedMember.fullName : donorName,
    );
    if (choiceError) {
      setError(choiceError);
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("amount", amount.trim());
      fd.append("paymentMethod", paymentMethod);
      if (lockedMember) {
        fd.append("userId", lockedMember.id);
        if (wantsName === false) fd.append("anonymous", "true");
      } else {
        fd.append("anonymous", wantsName === false ? "true" : "false");
        if (wantsName === true) fd.append("donorName", donorName.trim());
      }

      const res = await fetch("/api/donations", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || texts.sendFailed);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (checkingMember) {
    return (
      <div className="app-shell">
        <PageLoading />
      </div>
    );
  }

  if (done) {
    return <DonateThanks />;
  }

  if (!lockedMember && !confirmedAnonymous) {
    return (
      <div className="app-shell">
        <PageHeader title={texts.title} />

        <div className="px-5 py-6 pb-10 space-y-5">
          <div className="card p-5 fade-up">
            <div className="mb-2 flex justify-center">
              <Icon name="heart" filled size={32} color="var(--mint-600)" />
            </div>
            <p className="text-sm font-bold mb-2 text-center" style={{ color: "var(--text-main)" }}>
              {texts.noAccountTitle}
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {texts.noAccountBody}
            </p>
          </div>

          <div
            className="card p-5 fade-up delay-1"
            style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)" }}
          >
            <p className="text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              <Icon name="trophy" size={14} className="icon-inline" /> {texts.joinHeading}
            </p>
            <ul className="text-sm space-y-1" style={{ color: "var(--text-muted)" }}>
              {texts.joinBenefits.map((benefit) => (
                <li key={benefit}>• {benefit}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2.5 fade-up delay-2">
            <button
              onClick={() => router.push(withFrom("/membership", "/donate"))}
              className="btn btn-primary"
            >
              <IconLabel name="user">{texts.createAccount}</IconLabel>
            </button>
            <button
              onClick={() => setConfirmedAnonymous(true)}
              className="btn"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              <IconLabel name="heart" filled>
                {texts.continueWithout}
              </IconLabel>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <PageHeader title={texts.title} />

      <div className="px-5 py-6 pb-10 space-y-5">
        <div className="card p-5 text-center fade-up">
          <div className="mb-2 flex justify-center">
            <Icon name="heart" filled size={32} color="var(--mint-600)" />
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {lockedMember ? texts.memberHint : texts.guestHint}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 fade-up delay-1">
          <PaymentInfoBanner offer={offer} />

          <div>
            <label
              htmlFor="donate-amount"
              className="block text-sm font-bold mb-1.5"
              style={{ color: "var(--text-main)" }}
            >
              {texts.amountLabel}
              <span style={{ color: "var(--copper-500)" }}>*</span>
            </label>
            <input
              id="donate-amount"
              type="number"
              min={1}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={texts.amountPlaceholder}
              required
              {...arabicValidity()}
              className="input"
              dir="ltr"
            />
          </div>

          <div>
            <p
              id="donate-method-label"
              className="block text-sm font-bold mb-2"
              style={{ color: "var(--text-main)" }}
            >
              {texts.methodLabel} <span style={{ color: "var(--copper-500)" }}>*</span>
            </p>
            <PaymentMethodChoice
              offer={offer}
              value={paymentMethod}
              onPick={setPaymentMethod}
              labelledBy="donate-method-label"
            />
          </div>

          <DonorNameChoice
            wantsName={wantsName}
            onPick={(wants) => {
              setWantsName(wants);
              if (!wants) setDonorName("");
            }}
            donorName={donorName}
            onDonorName={setDonorName}
            memberName={lockedMember?.fullName}
          />

          <div>
            <p className="text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              {texts.proofLabel} <span style={{ color: "var(--copper-500)" }}>*</span>
            </p>
            <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
              {previewUrl ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={texts.proofAlt}
                    className="max-h-48 mx-auto rounded-xl object-contain"
                  />
                  <p className="mt-2 text-xs text-center" style={{ color: "var(--mint-600)" }}>
                    {texts.changeImage}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-2 flex justify-center" style={{ color: "var(--mint-500)" }}>
                    <Icon name="receipt" size={36} />
                  </div>
                  <p className="font-bold text-sm" style={{ color: "var(--mint-700)" }}>
                    {texts.pickImage}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {texts.imageHint}
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
            <div
              className="p-4 rounded-xl text-sm font-semibold"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <Icon name="warning" size={14} className="icon-inline" /> {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? (
              texts.sending
            ) : (
              <IconLabel name="heart" filled>
                {texts.submit}
              </IconLabel>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
