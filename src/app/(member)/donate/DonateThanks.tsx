"use client";

import Icon from "@/components/Icon";
import SupportersLink from "@/components/SupportersLink";
import { donate as texts } from "@/lib/texts";

export default function DonateThanks() {
  return (
    <div className="app-shell flex items-center justify-center">
      <div className="card p-8 text-center max-w-sm mx-4 fade-up">
        <div className="mb-4 flex justify-center">
          <Icon name="heart" filled size={48} color="var(--mint-600)" />
        </div>
        <h1 className="text-lg font-black mb-2" style={{ color: "var(--text-main)" }}>
          {texts.thanksTitle}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          {texts.thanksBody}
        </p>
        <SupportersLink className="btn btn-primary" style={{}} />
      </div>
    </div>
  );
}
