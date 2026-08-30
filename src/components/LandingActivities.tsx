import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ActivityRowBody from "@/components/ActivityRowBody";
import ActivityStandingChip from "@/components/ActivityStandingChip";
import { activityAccent } from "@/lib/activityAccent";
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
  unplayedMatches?: number;
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

        <div className="pb-1 mb-2" style={{ borderBottom: "1px solid var(--mint-200)" }} />

        {activities.map((activity) => (
          <Link
            key={activity.id}
            href={`/activities/${activity.id}`}
            className={`card activity-row ${activityAccent(activity)} p-3.5 flex items-center gap-3`}
          >
            <ActivityRowBody
              title={activity.title}
              photo={activity.photo}
              isVolunteer={activity.isVolunteer}
              when={activity.when}
              chips={
                <>
                  <ActivityStandingChip
                    startsAt={activity.startsAt}
                    endsAt={activity.endsAt}
                    unplayedMatches={activity.unplayedMatches}
                  />
                  {!activity.isOpen && (
                    <span className="badge badge-rejected shrink-0" style={{ fontSize: "10px" }}>
                      {texts.closedChip}
                    </span>
                  )}
                </>
              }
            />
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
