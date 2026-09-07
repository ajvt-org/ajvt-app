import ArrowLabel from "@/components/ArrowLabel";
import Icon from "@/components/Icon";
import { myProfile } from "@/lib/texts";

const texts = myProfile.noMembership;

export default function NoMembershipCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="card p-6 text-center fade-up">
      <div className="mb-3 flex justify-center">
        <Icon name="list" size={40} />
      </div>
      <h2 className="text-lg font-black mb-2" style={{ color: "var(--text-main)" }}>
        {texts.title}
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        {texts.body}
      </p>
      <button onClick={onStart} className="btn btn-primary">
        <ArrowLabel>{texts.action}</ArrowLabel>
      </button>
    </div>
  );
}
