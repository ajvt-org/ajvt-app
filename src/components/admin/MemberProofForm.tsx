"use client";

import { useState } from "react";
import MemberProofButton from "./MemberProofButton";
import MemberProofPanel from "./MemberProofPanel";

export default function MemberProofForm({
  memberId,
  proof,
  onSaved,
}: {
  memberId: string;
  proof: string | null;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) return <MemberProofButton proof={proof} labelled onClick={() => setOpen(true)} />;

  return (
    <MemberProofPanel
      memberId={memberId}
      proof={proof}
      onSaved={onSaved}
      onClose={() => setOpen(false)}
    />
  );
}
