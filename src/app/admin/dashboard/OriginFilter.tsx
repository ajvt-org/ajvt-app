"use client";

import type { MemberFilters } from "@/lib/memberFilters";
import { ADMIN_ORIGIN, SELF_ORIGIN, UNKNOWN_ORIGIN } from "@/lib/membershipOrigin";
import { filterSheet as texts } from "@/lib/texts";
import type { RecordingAdmin } from "./types";

const NARROWINGS = [
  { key: "nophone", label: texts.noPhone },
  { key: "nocapture", label: texts.noCapture },
] as const;

export default function OriginFilter({
  filters,
  recordingAdmins,
  onChange,
}: {
  filters: MemberFilters;
  recordingAdmins: RecordingAdmin[];
  onChange: (next: MemberFilters) => void;
}) {
  return (
    <>
      <select
        value={filters.origin}
        onChange={(e) =>
          onChange(
            e.target.value === ADMIN_ORIGIN
              ? { ...filters, origin: ADMIN_ORIGIN }
              : { ...filters, origin: e.target.value, recorder: "", nophone: "", nocapture: "" },
          )
        }
        className="input input-sm w-full"
        aria-label={texts.byOrigin}
      >
        <option value="">{texts.allOrigins}</option>
        <option value={ADMIN_ORIGIN}>{texts.originAdmin}</option>
        <option value={SELF_ORIGIN}>{texts.originSelf}</option>
        <option value={UNKNOWN_ORIGIN}>{texts.originUnknown}</option>
      </select>

      {filters.origin === ADMIN_ORIGIN && recordingAdmins.length > 0 && (
        <select
          value={filters.recorder}
          onChange={(e) => onChange({ ...filters, recorder: e.target.value })}
          className="input input-sm w-full mt-2"
          aria-label={texts.byRecorder}
        >
          <option value="">{texts.allRecorders}</option>
          {recordingAdmins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.username}
            </option>
          ))}
        </select>
      )}

      {filters.origin === ADMIN_ORIGIN && (
        <div className="flex flex-wrap gap-2 mt-2">
          {NARROWINGS.map(({ key, label }) => {
            const on = !!filters[key];
            return (
              <button
                key={key}
                onClick={() => onChange({ ...filters, [key]: on ? "" : "yes" })}
                className="text-xs px-3 py-1.5 rounded-lg font-bold"
                style={{
                  background: on ? "var(--mint-600)" : "white",
                  color: on ? "white" : "var(--mint-700)",
                  border: on ? "none" : "1px solid var(--mint-100)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
