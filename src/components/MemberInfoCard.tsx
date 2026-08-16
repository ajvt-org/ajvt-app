import IconLabel from "@/components/IconLabel";
import { formatDate, formatTime } from "@/lib/utils";
import type { MemberData } from "@/lib/useMember";

// The name is not repeated here — it is the heading directly above. The
// acceptance date is, because an accepted request no longer shows the stages.
export default function MemberInfoCard({
  member,
  onEdit,
}: {
  member: MemberData;
  onEdit?: () => void;
}) {
  return (
    <div className="card p-5">
      <div
        className="flex items-center justify-between gap-3 mb-3 pb-2"
        style={{ borderBottom: "1px solid var(--mint-100)" }}
      >
        <h3 className="font-bold" style={{ color: "var(--text-main)" }}>
          بيانات الطلب
        </h3>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <IconLabel name="pencil">تعديل</IconLabel>
          </button>
        )}
      </div>
      <div className="space-y-2.5">
        <InfoRow label="رقم الهاتف" value={member.user?.phone ?? "—"} dir="ltr" />
        <InfoRow label="العصر" value={member.age} />
        <InfoRow label="طريقة الدفع" value={member.paymentMethod} />
        {member.paidAmount != null && (
          <InfoRow label="المبلغ المسدد" value={`${member.paidAmount} أوقية`} />
        )}
        <InfoRow label="تاريخ الطلب" value={formatDate(member.createdAt)} />
        <InfoRow label="وقت الطلب" value={formatTime(member.createdAt)} dir="ltr" />
        {member.status === "ACTIVE" && (
          <InfoRow label="تاريخ القبول" value={formatDate(member.updatedAt)} />
        )}
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
