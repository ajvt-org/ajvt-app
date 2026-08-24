import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import NumericRanges from "@/components/NumericRanges";
import { toThumbUrl } from "@/lib/utils";
import ActivityStandingChip from "@/components/ActivityStandingChip";
import { landingActivities as texts } from "@/lib/texts";

export type LandingActivity = {
  id: string;
  title: string;
  when: string | null;
  startsAt: string | Date | null;
  endsAt: string | Date | null;
  photo: string | null;
  isVolunteer: boolean;
  isOpen: boolean;
};

export default function LandingActivities({
  activities,
  heading = true,
}: {
  activities: LandingActivity[];
  heading?: boolean;
}) {
  return (
    <div
      id="activities"
      className="px-5 py-8"
      style={{ background: "var(--mint-50)", scrollMarginTop: "1rem" }}
    >
      {heading && (
        <h2 className="font-black text-lg mb-4 text-center" style={{ color: "var(--text-main)" }}>
          <IconLabel name="trophy">{texts.heading}</IconLabel>
        </h2>
      )}

      <div className="max-w-md mx-auto space-y-3">
        <Link
          href="/quiz"
          className="card p-3.5 flex items-center gap-3"
          style={{
            background: "linear-gradient(160deg, var(--mint-100), #fff 65%)",
            border: "1.5px solid var(--mint-500)",
          }}
        >
          <span
            className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center"
            style={{
              background: "linear-gradient(160deg, var(--mint-500), var(--mint-700))",
              color: "#fff",
            }}
          >
            <Icon name="quiz" size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-bold block" style={{ color: "var(--text-main)" }}>
              {texts.quizTitle}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {texts.quizSub}
            </span>
          </span>
          <Icon name="chevronLeft" size={16} className="shrink-0" />
        </Link>

        <div className="pb-1" style={{ borderBottom: "1px solid var(--mint-200)" }} />

        {activities.map((activity) => (
          <Link
            key={activity.id}
            href={`/activities/${activity.id}`}
            className="card p-3.5 flex items-center gap-3"
          >
            {activity.photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={toThumbUrl(`/api/files/activity/${activity.photo}`)}
                alt=""
                width={44}
                height={44}
                loading="lazy"
                decoding="async"
                className="w-11 h-11 rounded-full object-cover shrink-0"
                style={{ border: "1.5px solid var(--mint-200)" }}
              />
            ) : (
              <span
                className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
              >
                <Icon name={activity.isVolunteer ? "handshake" : "trophy"} size={20} />
              </span>
            )}

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-bold truncate" style={{ color: "var(--text-main)" }}>
                  {activity.title}
                </span>
                <ActivityStandingChip startsAt={activity.startsAt} endsAt={activity.endsAt} />
                {!activity.isOpen && (
                  <span className="badge badge-rejected shrink-0" style={{ fontSize: "10px" }}>
                    {texts.closedChip}
                  </span>
                )}
              </span>
              {activity.when && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <Icon name="calendar" size={12} className="icon-inline" />{" "}
                  <NumericRanges>{activity.when}</NumericRanges>
                </span>
              )}
            </span>

            <Icon name="chevronLeft" size={16} className="shrink-0" />
          </Link>
        ))}
      </div>

      {activities.length > 0 && (
        <p className="text-xs text-center mt-5" style={{ color: "var(--text-muted)" }}>
          {texts.signUpHint}
        </p>
      )}
    </div>
  );
}
