import Icon from "@/components/Icon";
import { toThumbUrl } from "@/lib/utils";
import { activityPage as texts } from "@/lib/texts";

export default function ActivityHero({
  title,
  photo,
  isVolunteer,
  isOpen,
}: {
  title: string;
  photo: string | null;
  isVolunteer: boolean;
  isOpen: boolean;
}) {
  return (
    <div className="activity-hero">
      {photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={toThumbUrl(`/api/files/activity/${photo}`)}
            alt=""
            aria-hidden="true"
            className="photo-fill-blur"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/files/activity/${photo}`}
            alt={title}
            decoding="async"
            className="photo-fill-img"
          />
        </>
      ) : (
        <span className="activity-hero-empty">
          <Icon name={isVolunteer ? "handshake" : "trophy"} size={72} />
        </span>
      )}
      <span className="activity-hero-badge">
        {isOpen ? (
          <span className="badge badge-open font-bold">
            <span className="badge-dot" aria-hidden="true" />
            {texts.openBadge}
          </span>
        ) : (
          <span className="badge badge-rejected">{texts.closedBadge}</span>
        )}
      </span>
    </div>
  );
}
