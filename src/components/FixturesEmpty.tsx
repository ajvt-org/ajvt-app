import Icon from "@/components/Icon";
import { emptyReason } from "@/lib/memberFixtures";

export default function FixturesEmpty({ teamCount }: { teamCount: number }) {
  const reason = emptyReason(teamCount);

  return (
    <div className="card p-6 text-center">
      <div className="mb-2 flex justify-center">
        <Icon name="calendar" size={32} color="var(--mint-400)" />
      </div>
      <p className="font-semibold" style={{ color: "var(--text-main)" }}>
        {reason === "NO_TEAM" ? "لست في أي فريق بعد" : "لا توجد مباريات مبرمجة"}
      </p>
      <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
        {reason === "NO_TEAM"
          ? "سجّل في بطولة وسيضمّك المشرف إلى فريق."
          : "بمجرد برمجة مباراة لفريقك ستظهر هنا."}
      </p>
    </div>
  );
}
