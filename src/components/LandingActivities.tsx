import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import NumericRanges from "@/components/NumericRanges";
import { toThumbUrl } from "@/lib/utils";

// The same short rows a signed-in member sees, so the two sides of the app
// read alike. Everything else about an activity lives on its own page, which
// a visitor can open without an account.
export type LandingActivity = {
  id: string;
  title: string;
  when: string | null;
  photo: string | null;
  isVolunteer: boolean;
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
          <IconLabel name="trophy">أنشطة هذا الصيف</IconLabel>
        </h2>
      )}

      <div className="max-w-md mx-auto space-y-3">
        <Link
          href="/quiz"
          className="card p-3.5 flex items-center gap-3"
          style={{ background: "white", border: "1.5px solid var(--mint-500)" }}
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
            <span
              className="font-bold flex items-center gap-1.5"
              style={{ color: "var(--text-main)" }}
            >
              المسابقة الثقافية
              <span
                className="expense-tag"
                style={{ background: "var(--mint-600)", color: "white" }}
              >
                مميزة
              </span>
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              أسئلة يومية، نقاط، وترتيب بين المنتسبين
            </span>
          </span>
          <Icon name="chevronLeft" size={16} className="shrink-0" />
        </Link>

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
              <span className="font-bold block truncate" style={{ color: "var(--text-main)" }}>
                {activity.title}
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
          أنشئ حساباً وأكمل استمارة الانضمام للتسجيل في الأنشطة
        </p>
      )}
    </div>
  );
}
