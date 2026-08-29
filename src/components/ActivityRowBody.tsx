import type { ReactNode } from "react";
import Icon, { type IconName } from "@/components/Icon";
import NumericRanges from "@/components/NumericRanges";
import { toThumbUrl } from "@/lib/utils";

export default function ActivityRowBody({
  title,
  photo,
  icon,
  isVolunteer,
  when,
  meta,
  chips,
}: {
  title: string;
  photo?: string | null;
  icon?: IconName;
  isVolunteer?: boolean;
  when?: string | null;
  meta?: ReactNode;
  chips?: ReactNode;
}) {
  return (
    <>
      {photo ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={toThumbUrl(`/api/files/activity/${photo}`)}
          alt=""
          width={52}
          height={52}
          loading="lazy"
          decoding="async"
          className="activity-thumb"
        />
      ) : (
        <span className="activity-thumb">
          <Icon name={icon ?? (isVolunteer ? "handshake" : "trophy")} size={22} />
        </span>
      )}

      <span className="min-w-0 flex-1 space-y-1">
        <span className="activity-title block" style={{ color: "var(--text-main)" }}>
          {title}
        </span>
        {(when || meta) && (
          <span className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
            {when && (
              <span className="flex items-center gap-1.5">
                <Icon name="calendar" size={12} />
                <NumericRanges>{when}</NumericRanges>
              </span>
            )}
            {meta}
          </span>
        )}
        {chips && <span className="flex items-center gap-1.5 flex-wrap">{chips}</span>}
      </span>
    </>
  );
}
