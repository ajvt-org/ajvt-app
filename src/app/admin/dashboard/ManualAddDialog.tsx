"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { manualAdd } from "@/lib/texts";
import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import { useAdminVillages } from "@/components/admin/useAdminVillages";
import { emptyManualForm } from "./constants";
import ManualAddForm from "./ManualAddForm";
import ManualAddResult from "./ManualAddResult";
import type { AgeGroup } from "./types";

type Props = {
  ageGroups: AgeGroup[];
  initialPhone?: string;
  onCreated: () => Promise<void> | void;
  onManageAgeGroups: () => void;
  onManageVillages: () => void;
  onClose: () => void;
};

export default function ManualAddDialog({
  ageGroups,
  initialPhone,
  onCreated,
  onManageAgeGroups,
  onManageVillages,
  onClose,
}: Props) {
  const [form, setForm] = useState({ ...emptyManualForm, accountPhone: initialPhone ?? "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tempPassword?: string } | null>(null);
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

  async function createMember(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await api.post<{ tempPassword?: string }>("/api/admin/members", {
        ...form,
        paymentProof: proof,
        photo,
      });
      setResult({ tempPassword: data.tempPassword });
      setForm(emptyManualForm);
      setProof(null);
      setProofPreview(null);
      setPhoto(null);
      setPhotoPreview(null);
      await onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

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
        <DialogHeader
          title={<IconLabel name="plus">{manualAdd.title}</IconLabel>}
          onClose={onClose}
        />

        <div className="p-5 space-y-3">
          {result ? (
            <ManualAddResult
              tempPassword={result.tempPassword}
              onAddAnother={() => setResult(null)}
            />
          ) : (
            <ManualAddForm
              form={form}
              setForm={setForm}
              ageGroups={ageGroups}
              villages={villages}
              photoPreview={photoPreview}
              photoUploading={photoUploading}
              proofPreview={proofPreview}
              proofUploading={proofUploading}
              error={error}
              loading={loading}
              onPhoto={picker(setPhotoPreview, setPhotoUploading, setPhoto)}
              onProof={picker(setProofPreview, setProofUploading, setProof)}
              onManageAgeGroups={onManageAgeGroups}
              onManageVillages={onManageVillages}
              onSubmit={createMember}
            />
          )}
        </div>
      </div>
    </div>
  );
}
