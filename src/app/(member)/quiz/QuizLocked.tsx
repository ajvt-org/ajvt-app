"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PageHeader from "@/components/PageHeader";

export default function QuizLocked({
  backHref,
  message,
  action,
}: {
  backHref: string;
  message: string;
  action: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <PageHeader title="المسابقات الثقافية" backHref={backHref} />
      <div className="px-5 py-10">
        <div className="card p-8 text-center fade-up">
          <div className="mb-3 flex justify-center">
            <Icon name="lock" size={40} />
          </div>
          <p className="font-bold" style={{ color: "var(--text-main)" }}>
            المسابقة متاحة للمنتسبين فقط
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            {message}
          </p>
          <div className="pt-5">{action}</div>
        </div>
      </div>
    </div>
  );
}

export function CreateAccountAction() {
  return (
    <Link href="/form" className="btn btn-primary">
      <IconLabel name="pencil">أنشئ حسابك</IconLabel>
    </Link>
  );
}
