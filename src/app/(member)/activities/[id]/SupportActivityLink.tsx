import Link from "next/link";
import IconLabel from "@/components/IconLabel";
import { donateHref } from "@/lib/activityGifts";
import { activityPage as texts } from "@/lib/texts";

export default function SupportActivityLink({ activityId }: { activityId: string }) {
  return (
    <Link
      href={donateHref(activityId)}
      className="btn"
      style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
    >
      <IconLabel name="heart" filled>
        {texts.supportCta}
      </IconLabel>
    </Link>
  );
}
