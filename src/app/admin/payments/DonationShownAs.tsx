"use client";

import IconLabel from "@/components/IconLabel";
import { donationEdit } from "@/lib/texts";
import MemberIdentity from "./MemberIdentity";
import { FIELD, QUIET } from "./donationTones";
import type { MemberOption } from "./paymentTypes";

export default function DonationShownAs({
  name,
  linked,
  linkedMember,
  onRelink,
}: {
  name: string;
  linked: boolean;
  linkedMember?: MemberOption;
  onRelink: () => void;
}) {
  return (
    <div className="rounded-lg p-2 space-y-1.5" style={FIELD}>
      <p className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>
        {donationEdit.shownAs}
      </p>
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        {name}
      </p>
      {linkedMember && <MemberIdentity member={linkedMember} size={26} />}
      <button
        onClick={onRelink}
        className="text-[11px] px-2 py-1 rounded-lg font-bold"
        style={QUIET}
      >
        <IconLabel name="link" size={11}>
          {linked ? donationEdit.changeLink : donationEdit.link}
        </IconLabel>
      </button>
    </div>
  );
}
