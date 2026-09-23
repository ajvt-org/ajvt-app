import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { donate as texts } from "@/lib/texts";

export default function GiftRefused() {
  return (
    <div className="app-shell">
      <PageHeader title={texts.title} />

      <div className="px-5 py-6 pb-10 space-y-5">
        <div className="card p-5 text-center fade-up">
          <div className="mb-2 flex justify-center">
            <Icon name="warning" size={32} color="var(--copper-500)" />
          </div>
          <p className="text-sm" style={{ color: "var(--text-main)" }}>
            {texts.activityRefused}
          </p>
        </div>

        <Link href="/donate" className="btn btn-primary fade-up delay-1">
          <IconLabel name="heart" filled>
            {texts.giveToAssociation}
          </IconLabel>
        </Link>
      </div>
    </div>
  );
}
