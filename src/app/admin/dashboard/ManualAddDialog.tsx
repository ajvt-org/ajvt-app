"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { manualAdd } from "@/lib/texts";
import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import { useAdminVillages } from "@/components/admin/useAdminVillages";
import { emptyPaymentForm, emptyPersonForm } from "./constants";
import ManualAddPersonForm from "./ManualAddPersonForm";
import ManualAddPaymentForm from "./ManualAddPaymentForm";
import ManualAddResult from "./ManualAddResult";
import type { AgeGroup } from "./types";

type Props = {
  ageGroups: AgeGroup[];
  payFor?: { id: string; fullName: string } | null;
  onCreated: () => Promise<void> | void;
  onManageAgeGroups: () => void;
  onManageVillages: () => void;
  onClose: () => void;
};

type Saved = { id: string; fullName: string; tempPassword?: string };

export default function ManualAddDialog({
  ageGroups,
  payFor,
  onCreated,
  onManageAgeGroups,
  onManageVillages,
  onClose,
}: Props) {
  const [person, setPerson] = useState(emptyPersonForm);
  const [payment, setPayment] = useState(emptyPaymentForm);
  const [saved, setSaved] = useState<Saved | null>(payFor ?? null);
  const [done, setDone] = useState<{ tempPassword?: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const { villages } = useAdminVillages();

  function picker(
    setPreview: (value: string | null) => void,
    setUploading: (value: boolean) => void,
    setName: (value: string | null) => void,
  ) {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setPreview(URL.createObjectURL(file));
      setUploading(true);
      try {
        setName(await uploadFile(file));
      } catch (err) {
        setError(errorMessage(err));
        setPreview(null);
      } finally {
        setUploading(false);
      }
    };
  }

  function reset() {
    setPerson(emptyPersonForm);
    setPayment(emptyPaymentForm);
    setSaved(null);
    setProof(null);
    setProofPreview(null);
    setPhoto(null);
    setPhotoPreview(null);
  }

  async function createPerson(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post<{ person: { id: string }; tempPassword?: string }>(
        "/api/admin/people",
        { ...person, photo },
      );
      setSaved({ id: data.person.id, fullName: person.fullName, tempPassword: data.tempPassword });
      await onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function createPayment(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!saved) return;
    setError("");
    setLoading(true);
    try {
      await api.post(`/api/admin/people/${saved.id}/membership`, {
        ...payment,
        paymentProof: proof,
      });
      finish();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    setDone({ tempPassword: saved?.tempPassword });
    reset();
    await onCreated();
  }

  const step = done ? manualAdd.title : saved ? manualAdd.paymentStep : manualAdd.personStep;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
        style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
      >
        <DialogHeader title={<IconLabel name="plus">{step}</IconLabel>} onClose={onClose} />

        <div className="p-5 space-y-3">
          {done ? (
            <ManualAddResult
              tempPassword={done.tempPassword}
              onAddAnother={() => {
                setDone(null);
                setError("");
              }}
            />
          ) : saved ? (
            <ManualAddPaymentForm
              form={payment}
              setForm={setPayment}
              personName={saved.fullName}
              proofPreview={proofPreview}
              proofUploading={proofUploading}
              error={error}
              loading={loading}
              onProof={picker(setProofPreview, setProofUploading, setProof)}
              onSkip={finish}
              onSubmit={createPayment}
            />
          ) : (
            <ManualAddPersonForm
              form={person}
              setForm={setPerson}
              ageGroups={ageGroups}
              villages={villages}
              photoPreview={photoPreview}
              photoUploading={photoUploading}
              error={error}
              loading={loading}
              onPhoto={picker(setPhotoPreview, setPhotoUploading, setPhoto)}
              onManageAgeGroups={onManageAgeGroups}
              onManageVillages={onManageVillages}
              onSubmit={createPerson}
            />
          )}
        </div>
      </div>
    </div>
  );
}
