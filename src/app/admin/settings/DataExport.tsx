import IconLabel from "@/components/IconLabel";
import { DATASETS, type Dataset } from "@/lib/exportRows";

const LABEL: Record<Dataset, string> = {
  members: "الانتساب",
  donations: "الدعم",
  ages: "الأعصار",
};

export default function DataExport() {
  return (
    <div className="card p-4 space-y-3">
      <p className="font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="download">تصدير البيانات</IconLabel>
      </p>

      <div className="flex flex-wrap gap-2">
        {DATASETS.map((dataset) => (
          <a
            key={dataset}
            href={`/api/admin/export/${dataset}`}
            className="text-xs px-3 py-2 rounded-lg font-bold"
            style={{
              background: "var(--mint-100)",
              color: "var(--mint-700)",
              border: "1px solid var(--mint-200)",
            }}
          >
            {LABEL[dataset]}
          </a>
        ))}
      </div>
    </div>
  );
}
