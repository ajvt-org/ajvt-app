import ActivityRowBody from "@/components/ActivityRowBody";
import ActivityStandingChip from "@/components/ActivityStandingChip";
import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";
import { activityAccent } from "@/lib/activityAccent";
import { verifyPage } from "@/lib/texts";
import type { EnrollmentItem } from "@/lib/verifyEnrollments";

function iconFor(item: EnrollmentItem): IconName {
  if (item.kind === "competition") return "quiz";
  return item.isVolunteer ? "handshake" : "trophy";
}

export default function VerifyEnrollments({ items }: { items: EnrollmentItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="px-5 py-5">
      <p className="font-black text-sm mb-3" style={{ color: "var(--text-muted)" }}>
        <IconLabel name="trophy">{verifyPage.enrolledIn}</IconLabel>
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={`card activity-row ${activityAccent({ startsAt: item.startsAt, endsAt: item.endsAt })} p-3.5 flex items-center gap-3`}
          >
            <ActivityRowBody
              title={item.label}
              photo={item.photo}
              icon={iconFor(item)}
              chips={
                <ActivityStandingChip
                  startsAt={item.startsAt}
                  endsAt={item.endsAt}
                  showUnscheduled
                />
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
