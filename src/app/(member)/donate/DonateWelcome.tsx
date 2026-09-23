import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { donate as texts } from "@/lib/texts";

export default function DonateWelcome({
  onJoin,
  onContinue,
}: {
  onJoin: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="app-shell">
      <PageHeader title={texts.title} />

      <div className="px-5 py-6 pb-10 space-y-5">
        <div className="card p-5 fade-up">
          <div className="mb-2 flex justify-center">
            <Icon name="heart" filled size={32} color="var(--mint-600)" />
          </div>
          <p className="text-sm font-bold mb-2 text-center" style={{ color: "var(--text-main)" }}>
            {texts.noAccountTitle}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {texts.noAccountBody}
          </p>
        </div>

        <div
          className="card p-5 fade-up delay-1"
          style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)" }}
        >
          <p className="text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
            <Icon name="trophy" size={14} className="icon-inline" /> {texts.joinHeading}
          </p>
          <ul className="text-sm space-y-1" style={{ color: "var(--text-muted)" }}>
            {texts.joinBenefits.map((benefit) => (
              <li key={benefit}>• {benefit}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-2.5 fade-up delay-2">
          <button onClick={onJoin} className="btn btn-primary">
            <IconLabel name="user">{texts.createAccount}</IconLabel>
          </button>
          <button
            onClick={onContinue}
            className="btn"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <IconLabel name="heart" filled>
              {texts.continueWithout}
            </IconLabel>
          </button>
        </div>
      </div>
    </div>
  );
}
