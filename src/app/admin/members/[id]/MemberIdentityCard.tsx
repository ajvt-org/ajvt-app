"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import VerbButton from "@/components/admin/VerbButton";
import EditRecordButton from "@/components/admin/EditRecordButton";
import { GRAVE, RISKY, SAFE } from "@/components/admin/verbTones";
import TempPasswordBox, { type TempPassword } from "@/components/admin/TempPasswordBox";
import { api, errorMessage } from "@/lib/api";
import { DETAIL_SEPARATOR, personDetails } from "@/lib/personDetails";
import { toThumbUrl } from "@/lib/utils";
import { accountPhone, memberAccount, memberPage, memberPhoto } from "@/lib/texts";
import AccountPhoneForm from "./AccountPhoneForm";
import CreateAccountForm from "./CreateAccountForm";
import MemberPhotoDialogs, { type PhotoAsking } from "./MemberPhotoDialogs";

export default function MemberIdentityCard({
  memberId,
  userId,
  fullName,
  photo,
  phone,
  village,
  age,
  memberNumber,
  photoLocked,
  editing,
  onToggleEdit,
  onChanged,
}: {
  memberId: string;
  userId: string | null;
  fullName: string;
  photo: string | null;
  phone: string | null;
  village: string;
  age: string | null;
  memberNumber: string | null;
  photoLocked: boolean;
  editing: boolean;
  onToggleEdit: () => void;
  onChanged: () => void;
}) {
  const [correcting, setCorrecting] = useState(false);
  const [temp, setTemp] = useState<TempPassword | null>(null);
  const [asking, setAsking] = useState<PhotoAsking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const details = personDetails({ phone, village, age });

  async function run(call: Promise<unknown>) {
    setBusy(true);
    setError("");
    setAsking(null);
    try {
      await call;
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function resetPassword() {
    return run(
      api
        .post<{ tempPassword: string; hours: number }>("/api/admin/reset-password", { userId })
        .then((data) => setTemp({ password: data.tempPassword, hours: data.hours })),
    );
  }

  function changePhoto() {
    return run(api.patch(`/api/admin/members/${memberId}`, { photo: null }));
  }

  function lockPhoto() {
    if (!photoLocked && photo) return setAsking("lock");
    return run(api.patch(`/api/admin/members/${memberId}`, { photoLocked: !photoLocked }));
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        {photo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={toThumbUrl(`/api/files/${photo}`)}
            alt={fullName}
            className="w-14 h-14 rounded-full object-cover shrink-0"
          />
        ) : (
          <span
            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--mint-100)" }}
          >
            <Icon name="user" size={24} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-black text-base" style={{ color: "var(--text-main)" }}>
            {fullName}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            <bdi>{details}</bdi>
            {memberNumber && (
              <>
                {DETAIL_SEPARATOR}
                <bdi dir="ltr" className="whitespace-nowrap">
                  {memberNumber}
                </bdi>
              </>
            )}
          </p>
          {!userId && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {memberAccount.none}
            </p>
          )}
          {photoLocked && (
            <span className="badge badge-rejected mt-1">{memberPhoto.lockedBadge}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-x-4 gap-y-2 mt-3">
        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
          <EditRecordButton
            label={memberPage.edit}
            closeLabel={memberPage.cancel}
            open={editing}
            onClick={onToggleEdit}
          />
          {userId &&
            (phone ? (
              <VerbButton
                icon="phone"
                label={accountPhone.edit}
                tone={SAFE}
                onClick={() => setCorrecting(true)}
              />
            ) : (
              <VerbButton
                icon="plus"
                label={accountPhone.add}
                tone={SAFE}
                onClick={() => setCorrecting(true)}
              >
                {accountPhone.add}
              </VerbButton>
            ))}
          {userId && (
            <VerbButton
              icon="lock"
              label={memberAccount.reset}
              tone={SAFE}
              disabled={busy}
              onClick={resetPassword}
            >
              {memberAccount.reset}
            </VerbButton>
          )}
          <VerbButton
            icon={photoLocked ? "check" : "ban"}
            label={photoLocked ? memberPhoto.unlock : memberPhoto.lock}
            tone={photoLocked ? SAFE : RISKY}
            disabled={busy}
            onClick={lockPhoto}
          />
        </div>
        {photo && (
          <div className="shrink-0 flex flex-wrap items-center gap-2">
            <VerbButton
              icon="trash"
              label={memberPhoto.remove}
              tone={GRAVE}
              disabled={busy}
              onClick={() => setAsking("remove")}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs font-semibold mt-2" style={{ color: "#991b1b" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}

      {correcting && (
        <div className="mt-3">
          <AccountPhoneForm
            memberId={memberId}
            phone={phone}
            onSaved={(made) => {
              setCorrecting(false);
              setTemp(made);
              onChanged();
            }}
            onCancel={() => setCorrecting(false)}
          />
        </div>
      )}

      {!userId && (
        <div className="mt-3">
          <CreateAccountForm
            memberId={memberId}
            onCreated={(made) => {
              setTemp(made);
              onChanged();
            }}
          />
        </div>
      )}

      {temp && <TempPasswordBox value={temp.password} hours={temp.hours} phone={phone} />}

      {asking && (
        <MemberPhotoDialogs
          asking={asking}
          busy={busy}
          onConfirm={() =>
            asking === "remove"
              ? changePhoto()
              : run(api.patch(`/api/admin/members/${memberId}`, { photoLocked: true }))
          }
          onClose={() => setAsking(null)}
        />
      )}
    </div>
  );
}
