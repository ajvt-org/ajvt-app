"use client";

import VerbButton from "@/components/admin/VerbButton";
import { SAFE } from "@/components/admin/verbTones";
import { memberProof as texts } from "@/lib/texts";

export default function MemberProofButton({
  proof,
  labelled,
  onClick,
}: {
  proof: string | null;
  labelled?: boolean;
  onClick: () => void;
}) {
  const label = proof ? texts.replace : texts.add;

  return (
    <VerbButton icon="camera" label={label} tone={SAFE} onClick={onClick}>
      {labelled ? label : undefined}
    </VerbButton>
  );
}
