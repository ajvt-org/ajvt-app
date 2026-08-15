import { formatDate, formatTime } from "@/lib/utils";
import type { MemberData } from "@/lib/useMembers";

export default function MemberInfoCard({ member }: { member: MemberData }) {
  return (
    <div className="card p-5">
      <h3
        className="font-bold mb-3 pb-2"
        style={{ color: "var(--text-main)", borderBottom: "1px solid var(--mint-100)" }}
      >
        بيانات الطلب
      </h3>
      <div className="space-y-2.5">
        <InfoRow label="الاسم الكامل" value={member.fullName} />
        <InfoRow label="رقم الهاتف" value={member.phone} dir="ltr" />
        <InfoRow label="العصر" value={member.age} />
        <InfoRow label="طريقة الدفع" value={member.paymentMethod} />
        {member.paidAmount != null && (
          <InfoRow label="المبلغ المسدد" value={`${member.paidAmount} أوقية`} />
        )}
        <InfoRow label="تاريخ الطلب" value={formatDate(member.createdAt)} />
        <InfoRow label="وقت الطلب" value={formatTime(member.createdAt)} dir="ltr" />
      </div>
    </div>
  );
}

function InfoRow({ label, value, dir }: { label: string; value: string; dir?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: "var(--text-main)" }} dir={dir}>
        {value}
      </span>
    </div>
  );
}
